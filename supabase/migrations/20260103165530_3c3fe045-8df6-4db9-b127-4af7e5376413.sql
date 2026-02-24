-- Create admin_roles table for custom roles
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create admin_menu_permissions table to store menu access for each role
CREATE TABLE public.admin_menu_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    menu_id TEXT NOT NULL,
    can_access BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_production BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(role_id, menu_id)
);

-- Create user_admin_roles table to assign roles to users
CREATE TABLE public.user_admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    assigned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_production BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_admin_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = check_user_id
      AND role = 'admin'::user_role
  )
$$;

-- Create function to get user menu permissions
CREATE OR REPLACE FUNCTION public.get_user_menu_permissions(check_user_id UUID)
RETURNS TABLE(menu_id TEXT, can_access BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- If user is main admin (from profiles), return all menus as accessible
  SELECT amp.menu_id, amp.can_access
  FROM public.user_admin_roles uar
  JOIN public.admin_roles ar ON uar.role_id = ar.id
  JOIN public.admin_menu_permissions amp ON ar.id = amp.role_id
  WHERE uar.user_id = check_user_id
    AND ar.is_active = true
    AND amp.can_access = true
    AND uar.is_production = true
    AND ar.is_production = true
    AND amp.is_production = true
$$;

-- RLS Policies for admin_roles
CREATE POLICY "Admins can manage roles"
ON public.admin_roles
FOR ALL
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Authenticated users can view active roles"
ON public.admin_roles
FOR SELECT
USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policies for admin_menu_permissions
CREATE POLICY "Admins can manage menu permissions"
ON public.admin_menu_permissions
FOR ALL
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Authenticated users can view their menu permissions"
ON public.admin_menu_permissions
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.user_admin_roles uar
    WHERE uar.role_id = admin_menu_permissions.role_id
    AND uar.user_id = auth.uid()
  )
);

-- RLS Policies for user_admin_roles
CREATE POLICY "Admins can manage user roles"
ON public.user_admin_roles
FOR ALL
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_admin_roles
FOR SELECT
USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_admin_menu_permissions_role_id ON public.admin_menu_permissions(role_id);
CREATE INDEX idx_user_admin_roles_user_id ON public.user_admin_roles(user_id);
CREATE INDEX idx_user_admin_roles_role_id ON public.user_admin_roles(role_id);

-- Insert default Super Admin role
INSERT INTO public.admin_roles (name, description, is_system_role) 
VALUES ('Super Admin', 'Full access to all admin features', true);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_roles_updated_at
BEFORE UPDATE ON public.admin_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_menu_permissions_updated_at
BEFORE UPDATE ON public.admin_menu_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();