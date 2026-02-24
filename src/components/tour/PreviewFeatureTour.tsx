import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPreviewTourSteps } from './PreviewTourSteps';
import livePreviewFull from '@/assets/tour/live-preview-full.png';
import { useIsMobile } from '@/hooks/use-mobile';

interface PreviewFeatureTourProps {
  tourType?: 'arrangement' | 'live-preview';
}

const PreviewFeatureTour: React.FC<PreviewFeatureTourProps> = ({ tourType = 'arrangement' }) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps] = useState<Step[]>(getPreviewTourSteps());
  
  const storageKey = tourType === 'live-preview' 
    ? 'is_live_preview_tour_completed' 
    : 'is_feature_tour_completed';

  useEffect(() => {
    // Don't run tour on mobile devices
    if (!isMobile) {
      checkAndStartTour();
    }
  }, [isMobile]);

  const checkAndStartTour = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select(storageKey)
        .eq('user_id', user.id)
        .single();

      if (profile && !profile[storageKey]) {
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
          description: "You now know what Live Preview has to offer. Upgrade to unlock it!",
        });
      }
    }

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
        .update({ [storageKey]: true })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking tour as completed:', error);
    }
  };

  return (
    <>
      {/* Image with mapped tour targets */}
      <div className="fixed inset-0 pointer-events-none z-[9999]" style={{ display: run ? 'block' : 'none' }}>
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <div className="relative max-w-6xl max-h-full">
            <img 
              id="preview-tour-image"
              src={livePreviewFull} 
              alt="Live Preview Interface"
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            {/* Invisible target areas for tour steps */}
            <div id="preview-tour-transpose" className="absolute" style={{ top: '2%', right: '12%', width: '120px', height: '40px' }} />
            <div id="preview-tour-share" className="absolute" style={{ top: '2%', right: '2%', width: '140px', height: '40px' }} />
            <div id="preview-tour-gesture" className="absolute" style={{ top: '42%', left: '2%', width: '320px', height: '40px' }} />
            <div id="preview-tour-tempo" className="absolute" style={{ top: '50%', left: '2%', width: '320px', height: '40px' }} />
            <div id="preview-tour-metronome" className="absolute" style={{ top: '56%', left: '2%', width: '320px', height: '40px' }} />
            <div id="preview-tour-sections" className="absolute" style={{ top: '65%', left: '2%', width: '320px', height: '190px' }} />
          </div>
        </div>
      </div>

      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep={false}
        disableScrolling={true}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: 'hsl(var(--primary))',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipTitle: {
            color: 'hsl(var(--foreground))',
          },
          tooltipContent: {
            color: 'hsl(var(--foreground))',
          },
          buttonNext: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
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
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
    </>
  );
};

export default PreviewFeatureTour;
