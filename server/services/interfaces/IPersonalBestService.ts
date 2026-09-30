export interface IPersonalBestService {
  getPersonalBest(userId: string, assessmentType: string): Promise<number | null>;
}
