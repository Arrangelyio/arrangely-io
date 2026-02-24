-- First, let's get the event ID for "Worship Night & Music Workshop"
DO $$
DECLARE
    event_uuid UUID;
    user_uuid UUID;
    registration_id UUID;
    i INTEGER;
    names TEXT[] := ARRAY[
        'John Smith', 'Maria Garcia', 'David Johnson', 'Sarah Wilson', 'Michael Brown',
        'Emma Davis', 'James Miller', 'Lisa Anderson', 'Robert Taylor', 'Jennifer White',
        'William Martinez', 'Patricia Thomas', 'Christopher Jackson', 'Linda Thompson',
        'Daniel Rodriguez', 'Barbara Lewis', 'Matthew Lee', 'Susan Walker', 'Anthony Hall',
        'Jessica Allen', 'Mark Young', 'Ashley King', 'Steven Wright', 'Kimberly Scott',
        'Joshua Green', 'Donna Adams', 'Kenneth Baker', 'Helen Nelson', 'Paul Carter',
        'Dorothy Mitchell', 'Edward Roberts', 'Carol Phillips', 'Brian Turner',
        'Nancy Campbell', 'Ronald Parker', 'Karen Evans', 'Kevin Edwards', 'Betty Collins',
        'Jason Stewart', 'Ruth Sanchez', 'Gary Morris', 'Sharon Murphy', 'Nicholas Reed',
        'Michelle Cook', 'Eric Bailey', 'Lisa Rivera', 'Stephen Cooper', 'Kimberly Richardson',
        'Andrew Cox', 'Deborah Howard', 'Raymond Ward', 'Dorothy Torres', 'Gregory Peterson',
        'Lisa Gray', 'Joshua Ramirez', 'Nancy James', 'Ryan Watson', 'Karen Brooks',
        'Jacob Kelly', 'Helen Sanders', 'Nicholas Price', 'Shirley Bennett', 'Gary Wood',
        'Angela Barnes', 'Kenneth Ross', 'Brenda Henderson', 'Joshua Coleman', 'Amy Jenkins',
        'Matthew Perry', 'Janet Powell', 'Christopher Long', 'Frances Patterson',
        'Anthony Hughes', 'Marilyn Flores', 'Mark Washington', 'Julie Butler',
        'Donald Simmons', 'Cheryl Foster', 'Steven Gonzales', 'Martha Bryant',
        'Paul Alexander', 'Gloria Russell', 'Andrew Griffin', 'Teresa Diaz',
        'Kenneth Hayes', 'Sara Myers', 'Joshua Ford', 'Janice Hamilton',
        'Ryan Graham', 'Kathleen Sullivan', 'Gary Wallace', 'Ann Woods',
        'Nicholas Cole', 'Joan West', 'Eric Jordan', 'Judith Owens',
        'Stephen Reynolds', 'Joyce Fisher', 'Andrew Ellis', 'Virginia Gibson',
        'Matthew Mason', 'Kelly Dixon', 'Anthony Hunter', 'Christina Hart',
        'Mark Fuller', 'Beverly Wells', 'Donald Welch', 'Laura Austin'
    ];
    domains TEXT[] := ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com'];
    phones TEXT[] := ARRAY['+62812', '+62813', '+62814', '+62815', '+62816', '+62817', '+62818', '+62819'];
    subscription_plans TEXT[] := ARRAY['basic_monthly', 'basic_yearly', 'premium_monthly', 'premium_yearly', 'free'];
    plan_weights INTEGER[] := ARRAY[25, 15, 30, 20, 10]; -- Distribution weights
    is_checked_in BOOLEAN;
    selected_plan TEXT;
    rand_val FLOAT;
    cumulative_weight INTEGER;
    j INTEGER;
BEGIN
    -- Get the event ID for "Worship Night & Music Workshop"
    SELECT id INTO event_uuid
    FROM public.events 
    WHERE title = 'Worship Night & Music Workshop'
    AND is_production = true
    LIMIT 1;
    
    IF event_uuid IS NULL THEN
        RAISE EXCEPTION 'Event "Worship Night & Music Workshop" not found';
    END IF;
    
    -- Create 100 dummy registrations
    FOR i IN 1..100 LOOP
        -- Generate registration
        INSERT INTO public.event_registrations (
            event_id,
            user_id,
            booking_id,
            attendee_name,
            attendee_email,
            attendee_phone,
            qr_code,
            payment_status,
            status,
            check_in_time,
            registration_date,
            amount_paid,
            is_production
        ) VALUES (
            event_uuid,
            gen_random_uuid(), -- Random user_id
            public.generate_secure_booking_id(),
            names[i],
            LOWER(REPLACE(names[i], ' ', '.')) || i || '@' || domains[(i % 5) + 1],
            phones[(i % 8) + 1] || LPAD((RANDOM() * 99999999)::INTEGER::TEXT, 8, '0'),
            'QR-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 12)),
            'paid',
            'confirmed',
            CASE 
                WHEN RANDOM() < 0.7 THEN NOW() - (RANDOM() * INTERVAL '2 hours')  -- 70% checked in
                ELSE NULL 
            END,
            NOW() - (RANDOM() * INTERVAL '30 days'),
            150000,
            true
        ) RETURNING id, user_id, check_in_time INTO registration_id, user_uuid, is_checked_in;
        
        -- Select subscription plan based on weighted distribution
        rand_val := RANDOM();
        cumulative_weight := 0;
        selected_plan := 'free'; -- default
        
        FOR j IN 1..array_length(plan_weights, 1) LOOP
            cumulative_weight := cumulative_weight + plan_weights[j];
            IF rand_val * 100 <= cumulative_weight THEN
                selected_plan := subscription_plans[j];
                EXIT;
            END IF;
        END LOOP;
        
        -- Create profile for this user with subscription info
        INSERT INTO public.profiles (
            user_id,
            display_name,
            role,
            is_production,
            musical_role,
            experience_level
        ) VALUES (
            user_uuid,
            names[i],
            'user',
            true,
            CASE (i % 4)
                WHEN 0 THEN 'worship_leader'
                WHEN 1 THEN 'musician'
                WHEN 2 THEN 'vocalist'
                ELSE 'sound_tech'
            END,
            CASE (i % 3)
                WHEN 0 THEN 'beginner'
                WHEN 1 THEN 'intermediate'
                ELSE 'advanced'
            END
        ) ON CONFLICT (user_id) DO NOTHING;
        
        -- Create subscription record if not free plan
        IF selected_plan != 'free' THEN
            INSERT INTO public.subscriptions (
                user_id,
                plan_id,
                status,
                current_period_start,
                current_period_end,
                is_production,
                created_at
            ) VALUES (
                user_uuid,
                gen_random_uuid(), -- We'll use plan metadata instead
                'active',
                NOW() - INTERVAL '15 days',
                NOW() + INTERVAL '15 days',
                true,
                NOW() - INTERVAL '15 days'
            );
        END IF;
        
        -- Store subscription plan info in a temporary way for lottery system
        -- We'll use the profiles table to store plan info
        UPDATE public.profiles 
        SET permissions = jsonb_build_object('subscription_plan', selected_plan)
        WHERE user_id = user_uuid;
        
    END LOOP;
    
    -- Update event current_registrations count
    UPDATE public.events 
    SET current_registrations = 100
    WHERE id = event_uuid;
    
    RAISE NOTICE 'Created 100 registrations for event %', event_uuid;
END $$;