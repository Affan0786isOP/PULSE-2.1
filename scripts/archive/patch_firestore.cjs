const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Change trialStore import to include getRawTrialObservations
  content = content.replace(
    "import { safeRandomUUID } from './utils';",
    "import { safeRandomUUID } from './utils';\nimport { getRawTrialObservations } from './trialStore';"
  );
  if (!content.includes('getRawTrialObservations')) {
      content = content.replace(
          "import { signInAnonymously } from 'firebase/auth';",
          "import { signInAnonymously } from 'firebase/auth';\nimport { getRawTrialObservations } from './trialStore';"
      );
  }

  // Update submitAssessmentResult API call to include trials
  content = content.replace(
    /body: JSON\.stringify\(\{[\s\S]*?assessmentType: payload\.assessmentType,[\s\S]*?ageGroup: payload\.ageGroup,[\s\S]*?metrics[\s\S]*?\}\)/,
    "body: JSON.stringify({\n          assessmentType: payload.assessmentType,\n          ageGroup: payload.ageGroup,\n          metrics,\n          trials: payload.idempotencyKey ? getRawTrialObservations({ experimentId: payload.idempotencyKey }) : []\n        })"
  );

  // Update submitLeaderboardResult API call to include trials
  content = content.replace(
    /body: JSON\.stringify\(\{[\s\S]*?displayName: payload\.displayName\.trim\(\),[\s\S]*?assessmentType: payload\.assessmentType,[\s\S]*?scoreMetric: payload\.scoreMetric,[\s\S]*?ageGroup: payload\.ageGroup[\s\S]*?\}\)/,
    "body: JSON.stringify({\n          displayName: payload.displayName.trim(),\n          assessmentType: payload.assessmentType,\n          scoreMetric: payload.scoreMetric,\n          ageGroup: payload.ageGroup,\n          trials: payload.idempotencyKey ? getRawTrialObservations({ experimentId: payload.idempotencyKey }) : []\n        })"
  );

  fs.writeFileSync(file, content);
}

patch('src/lib/firestore.ts');
patch('mobile/src/lib/firestore.ts');
