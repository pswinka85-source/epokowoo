/* ──────────────────────────────────────────────
   Lesson type definitions (data comes from database)
   ────────────────────────────────────────────── */

export interface LessonQuizOption {
  text: string;
  correct?: boolean;
}

export interface LessonQuiz {
  type: "quiz";
  question: string;
  options: LessonQuizOption[];
  explanation: string;
}

export interface LessonText {
  type: "text";
  content: string;
}

export interface LessonHeading {
  type: "heading";
  content: string;
}

export interface LessonImage {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
}

export interface LessonVideo {
  type: "video";
  youtubeId: string;
  caption?: string;
}

export interface LessonCallout {
  type: "callout";
  icon?: string;
  content: string;
}

export interface LessonAdvancedQuiz {
  type: "advanced_quiz";
  question: string;
  advanced_question_type: "abcd" | "fill_blank" | "matching" | "table_gap" | "ordering";
  question_data: Record<string, any>;
}

export interface LessonTimeline {
  type: "timeline";
  events: { date: string; title: string; description?: string }[];
}

export type LessonBlock =
  | LessonText
  | LessonHeading
  | LessonImage
  | LessonVideo
  | LessonQuiz
  | LessonCallout
  | LessonAdvancedQuiz
  | LessonTimeline;

export interface Lesson {
  id: string;
  title: string;
  description: string;
  blocks: LessonBlock[];
}
