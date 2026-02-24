import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Music, Youtube } from "lucide-react";
import { RegisterData } from "@/types/auth";
import { instruments, experienceLevels } from "@/constants/auth";

interface MusicalInfoFormProps {
  registerData: RegisterData;
  setRegisterData: (data: RegisterData) => void;
  toggleInstrument: (instrumentId: string, type: 'primary' | 'secondary') => void;
}

export const MusicalInfoForm = ({ registerData, setRegisterData, toggleInstrument }: MusicalInfoFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Music className="h-5 w-5" />
          Musical Background
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Primary Instrument(s)</Label>
          <p className="text-sm text-muted-foreground mb-3">Select your main instruments</p>
          <div className="grid grid-cols-2 gap-3">
            {instruments.map(instrument => {
              const Icon = instrument.icon;
              const isSelected = registerData.primaryInstrument.includes(instrument.id);
              return (
                <div
                  key={instrument.id}
                  onClick={() => toggleInstrument(instrument.id, 'primary')}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{instrument.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Secondary Instruments</Label>
          <p className="text-sm text-muted-foreground mb-3">Other instruments you can play</p>
          <div className="flex flex-wrap gap-2">
            {instruments.map(instrument => {
              const isSelected = registerData.secondaryInstruments.includes(instrument.id);
              return (
                <Badge
                  key={instrument.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleInstrument(instrument.id, 'secondary')}
                >
                  {instrument.name}
                </Badge>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="experience">Experience Level</Label>
          <Select value={registerData.experience} onValueChange={(value) => setRegisterData({...registerData, experience: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select your experience level" />
            </SelectTrigger>
            <SelectContent>
              {experienceLevels.map(level => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="bio">Bio (Optional)</Label>
          <Textarea
            id="bio"
            value={registerData.bio}
            onChange={(e) => setRegisterData({...registerData, bio: e.target.value})}
            placeholder="Tell us about your musical journey and ministry..."
            className="min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500" />
            YouTube Channel (Optional)
          </Label>
          <Input
            id="youtube"
            value={registerData.youtubeChannel}
            onChange={(e) => setRegisterData({...registerData, youtubeChannel: e.target.value})}
            placeholder="https://youtube.com/@yourchannel"
          />
        </div>
      </CardContent>
    </Card>
  );
};