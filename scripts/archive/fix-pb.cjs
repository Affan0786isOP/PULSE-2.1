const fs = require('fs');
function fix(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/export const getPersonalBest = async \([\s\S]*?export const submitLeaderboardResult = async/g,
    `export const getPersonalBest = async (
  assessmentType: AssessmentType, 
  isLowerBetter: boolean
): Promise<PersonalBestResult> => {
  try {
    const res = await fetchWithAuth(\`/api/personal-best?assessmentType=\${encodeURIComponent(assessmentType)}&isLowerBetter=\${isLowerBetter}\`);
    if (!res.ok) {
      throw new Error(\`Server returned HTTP \${res.status}\`);
    }
    const data = await res.json();
    if (data.success) {
      return { success: true, value: data.personalBest };
    }
    return { success: false, value: null, error: data.error };
  } catch (err: any) {
    return { success: false, value: null, error: err.message };
  }
};

export const submitLeaderboardResult = async`);
  fs.writeFileSync(filePath, content);
}
fix('src/lib/firestore.ts');
fix('mobile/src/lib/firestore.ts');
