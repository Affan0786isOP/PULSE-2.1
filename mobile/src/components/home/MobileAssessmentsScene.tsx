import { MobileSceneFrame } from './MobileSceneFrame';
import { MobileAssessmentCarousel } from '../ui/MobileAssessmentCarousel';

export function MobileAssessmentsScene() {
  return (
    <MobileSceneFrame id="assessments" eyebrow="02 / Protocol library" title="Choose what to measure." description="Five current assessments. Browse one at a time, then launch the protocol directly.">
      <MobileAssessmentCarousel />
    </MobileSceneFrame>
  );
}
