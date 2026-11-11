import { generateBacheloretteArtifact, reviseBacheloretteArtifact, type ItineraryArtifact } from './rally-runtime';
import { validTripDates } from '../rally/bachelorette/destinations';

export function validateAnswers(input: unknown): Record<string,string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Add your trip details.');
  const source = input as Record<string,unknown>;
  const answers: Record<string,string> = {};
  for (const key of ['bride','city','startDate','endDate','headcount','budget','vibe']) {
    if(typeof source[key] !== 'string' || !(source[key] as string).trim() || (source[key] as string).length > 200) throw new Error(`Check your ${key} answer.`);
    answers[key]=(source[key] as string).trim();
  }
  if(!validTripDates(answers.startDate,answers.endDate)) throw new Error('Choose valid arrival and departure dates, no more than 31 days apart.');
  if(!Number.isInteger(Number(answers.headcount)) || Number(answers.headcount)<1 || Number(answers.headcount)>100) throw new Error('Choose 1–100 guests.');
  if(!Number.isFinite(Number(answers.budget)) || Number(answers.budget)<=0 || Number(answers.budget)>100000) throw new Error('Choose a budget greater than $0 and at most $100,000.');
  if(!['Poolside & playful','Foodie & fabulous','Wellness & slow','Big night out','Crafty & cozy'].includes(answers.vibe)) throw new Error('Choose one of the listed vibes.');
  answers.dates=`${answers.startDate} to ${answers.endDate}`;
  return answers;
}
export function createDraft(input: unknown) {
  const answers=validateAnswers(input);
  return {answers,artifact:generateBacheloretteArtifact(answers)};
}
export function reviseDraft(artifact: ItineraryArtifact, answers: Record<string,string>, feedback: unknown, count: number) {
  if(count>=3) throw new Error('This plan includes up to three revisions. You can still edit your workspace manually.');
  if(typeof feedback!=='string' || !feedback.trim() || feedback.length>2000) throw new Error('Describe the change in 1–2,000 characters.');
  return reviseBacheloretteArtifact(artifact,feedback.trim(),answers);
}
export function artifactMarkdown(artifact: ItineraryArtifact) {
  const clean=(value:string)=>value.replace(/[\r\n]/g,' ').replace(/[<>]/g,'');
  return `# ${clean(artifact.title)}\n\n${clean(artifact.summary)}\n\nTemplate-based planning suggestions, not confirmed prices or bookings.\n\n` + artifact.days.map(day=>`## ${clean(day.label)}\n\n`+day.items.map(item=>`- ${clean(item.time)} — ${clean(item.title)}: ${clean(item.note)}`).join('\n')).join('\n\n')+'\n\n## Before booking\n\n'+artifact.bookingList.map(item=>`- ${clean(item)}`).join('\n')+'\n';
}
