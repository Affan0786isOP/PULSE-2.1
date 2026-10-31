export interface GuideCitation {
  author: string;
  title: string;
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  listItems?: string[];
}

export interface InteractiveCta {
  label: string;
  targetPath: string;
  referralToken: string;
}

export interface GuideDocument {
  title: string;
  subtitle: string;
  datePublished: string;
  dateModified?: string;
  sections: GuideSection[];
  citations: GuideCitation[];
  interactiveCta?: InteractiveCta;
  statisticalProtocol?: {
    unitOfAnalysis: string;
    estimationMethod: string;
    publicationGates: {
      medianTargetSessions: number;
      medianPrecisionTargetPct: number;
      outerTargetSessions: number;
      extremeQuantileStatus: string;
    };
  };
}

export type GuidesRepository = Record<string, GuideDocument>;

export declare function validateGuideContent(guidesData: unknown): guidesData is GuidesRepository;
