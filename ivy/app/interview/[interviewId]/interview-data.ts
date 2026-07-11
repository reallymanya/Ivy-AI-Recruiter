export type InterviewDetails = {
  id: string;
  role: string;
  schedule: string;
  duration: string;
  format: string;
  company: string;
  jobDescription: string;
};

export function getPlaceholderInterview(
  interviewId: string,
  interviewType: "screening" | "technical" | "hr_final" = "screening",
): InterviewDetails {
  const interviewDetails = {
    screening: {
      role: "AI Recruiter Screening",
      duration: "15-20 minutes",
      format: "AI voice screening",
    },
    technical: {
      role: "Technical Interview",
      duration: "30-45 minutes",
      format: "AI technical interview",
    },
    hr_final: {
      role: "HR Final Interview",
      duration: "20-30 minutes",
      format: "AI HR interview",
    },
  }[interviewType];

  return {
    id: interviewId,
    role: interviewDetails.role,
    schedule: "Today, 4:00 PM",
    duration: interviewDetails.duration,
    format: interviewDetails.format,
    company: "Ivy Recruiter",
    jobDescription:
      "owning discovery, screening alignment, structured candidate evaluation, and clear communication with hiring teams",
  };
}
