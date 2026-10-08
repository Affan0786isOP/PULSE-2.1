export interface AssessmentSection {
  id: string;
  heading: string;
  paragraphs: string[];
  listItems?: string[];
}

export interface AssessmentFaq {
  question: string;
  answer: string;
}

export interface AssessmentRelatedLink {
  path: string;
  label: string;
  description: string;
}

export interface AssessmentArticle {
  route: string;
  assessmentId: string;
  title: string;
  subtitle: string;
  sections: AssessmentSection[];
  faq: AssessmentFaq[];
  relatedLinks: AssessmentRelatedLink[];
}
