import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MapPin } from "lucide-react";
import { RegisterData } from "@/types/auth";
import { roles, hearAboutUsOptions } from "@/constants/auth";

interface ProfessionalInfoFormProps {
  registerData: RegisterData;
  setRegisterData: (data: RegisterData) => void;
}

export const ProfessionalInfoForm = ({ registerData, setRegisterData }: ProfessionalInfoFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Professional Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="role">Your Role *</Label>
          <p className="text-sm text-muted-foreground mb-2">Are you a keyboardist, pianist, music director, or other role?</p>
          <Select value={registerData.role} onValueChange={(value) => setRegisterData({...registerData, role: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select your primary role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="hearAboutUs">How did you hear about us? *</Label>
          <Select value={registerData.hearAboutUs} onValueChange={(value) => setRegisterData({...registerData, hearAboutUs: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select how you found us" />
            </SelectTrigger>
            <SelectContent>
              {hearAboutUsOptions.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={registerData.city}
                  onChange={(e) => setRegisterData({...registerData, city: e.target.value})}
                  placeholder="Nashville"
                />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={registerData.country}
                  onChange={(e) => setRegisterData({...registerData, country: e.target.value})}
                  placeholder="United States"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};