import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getGeneralTourSteps, getRoleSpecificSteps } from './tourSteps';
import { X } from 'lucide-react';

interface FeatureTourProps {
  userRole?: 'vocalist' | 'guitarist' | 'keyboardist' | 'bassist' | 'drummer' | null;
  onComplete?: () => void;
}

const FeatureTour: React.FC<FeatureTourProps> = ({ userRole, onComplete }) => {
  const { toast } = useToast();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    checkAndStartTour();
  }, [userRole]);

  const checkAndStartTour = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_feature_tour_completed')
        .eq('user_id', user.id)
        .single();

      if (profile && !profile.is_feature_tour_completed) {
        // Combine general and role-specific steps
        const generalSteps = getGeneralTourSteps();
        const roleSteps = userRole ? getRoleSpecificSteps(userRole) : [];
        
        setSteps([...generalSteps, ...roleSteps]);
        setRun(true);
      }
    } catch (error) {
      console.error('Error checking tour status:', error);
    }
  };

  const handleTourCallback = async (data: CallBackProps) => {
    const { status, type, index, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      await markTourAsCompleted();
      setRun(false);
      
      if (status === STATUS.FINISHED) {
        toast({
          title: "Tour Complete! 🎉",
          description: "You're all set to start performing!",
        });
      }
      
      onComplete?.();
    }

    // Update step index
    if (type === 'step:after') {
      // Move forward or backward based on action
      setStepIndex(index + (action === 'prev' ? -1 : 1));
    }
  };

  const markTourAsCompleted = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ is_feature_tour_completed: true })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking tour as completed:', error);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      callback={handleTourCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '600',
        },
        buttonBack: {
          color: 'hsl(var(--foreground))',
          marginRight: '10px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
        buttonClose: {
          display: 'none',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: '8px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))',
          },
        },
      }}
    />
  );
};

export default FeatureTour;
