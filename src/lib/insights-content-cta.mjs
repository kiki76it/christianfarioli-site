// Overrides for this editorial batch only. Existing post/category choices stay intact.
export const INSIGHTS_CONTENT_BATCH = Object.freeze([
  {code:'A1',id:'ai-marketing/ai-training-marketing-teams-dubai',title:'AI Training for Marketing Teams in Dubai: What Should It Actually Cover?',cta:'marketingTraining',topic:'AI training for marketing teams'},
  {code:'A2',id:'ai-marketing/ai-marketing-strategy-without-more-tools',title:'How to Build an AI Marketing Strategy Without Adding More Tools',cta:'marketingStrategy',topic:'AI marketing strategy'},
  {code:'A3',id:'ai-marketing/ai-marketing-agency-vs-traditional-digital-agency',title:'AI Marketing Agency vs Traditional Digital Agency: What Should Companies Look For?',cta:'marketingStrategy',topic:'marketing agency selection'},
  {code:'A4',id:'ai-marketing/prepare-marketing-teams-for-ai',title:'How Should CMOs Prepare Their Marketing Teams for AI?',cta:'marketingTraining',topic:'preparing marketing teams for AI'},
  {code:'B1',id:'future-of-work/digital-employees-vs-human-employees',title:'Digital Employees vs Human Employees: What Should Companies Actually Automate?',cta:'digitalEmployees',topic:'Digital Employees and bounded automation'},
  {code:'B2',id:'future-of-work/ai-middle-management',title:'How Will AI Change Middle Management?',cta:'futureOfWork',topic:'AI and the responsibilities of middle managers'},
  {code:'B3',id:'future-of-work/ai-leadership-offsite',title:'AI Leadership Offsite: What Should Executives Discuss in 2027?',cta:'leadershipOffsite',topic:'an AI leadership offsite'},
  {code:'B4',id:'future-of-work/which-jobs-will-ai-change-first',title:'Which Jobs Will AI Change First - and What Should Companies Do About It?',cta:'futureOfWork',topic:'workforce planning and AI skills'},
  {code:'C1',id:'human-centered-ai/human-in-the-loop-ai-business',title:'Human-in-the-Loop AI: What Does It Actually Mean for Business?',cta:'humanCentred',topic:'meaningful human oversight of AI'},
  {code:'C2',id:'human-centered-ai/ai-augment-people-not-reduce-headcount',title:'AI Should Augment People, Not Just Reduce Headcount',cta:'futureOfWork',topic:'AI augmentation and the future of work'},
  {code:'C3',id:'human-centered-ai/human-control-ai-deployment',title:'Where Should Humans Stay in Control When Companies Deploy AI?',cta:'humanCentred',topic:'human control when deploying AI'},
  {code:'C4',id:'human-centered-ai/introduce-ai-without-losing-employee-trust',title:'How to Introduce AI Without Losing Employee Trust',cta:'humanCentred',topic:'AI adoption and employee trust'},
]);

/** @type {Record<string,{variant:'marketing'|'training'|'ai'|'general',title:string,description:string}>} */
const copy = {
  marketingTraining: {variant:'training',title:'Planning AI training for your marketing team?',description:'Let’s discuss your team’s roles, learning priorities and the practical work a tailored programme should help them improve.'},
  marketingStrategy: {variant:'marketing',title:'Ready to build a clearer AI marketing strategy?',description:'Let’s discuss your growth priorities and whether a strategy workshop or advisory engagement would be the right next step.'},
  digitalEmployees: {variant:'ai',title:'Considering Digital Employees for your organisation?',description:'Let’s discuss where they could create value, what controls you would need and which responsibilities should remain with your team.'},
  futureOfWork: {variant:'general',title:'Preparing your leaders for the future of work?',description:'Let’s discuss a keynote or executive workshop focused on the decisions your organisation needs to make.'},
  leadershipOffsite: {variant:'general',title:'Planning an AI session for your leadership offsite?',description:'Let’s discuss your audience, priorities and the format that would make the conversation useful for your leadership team.'},
  humanCentred: {variant:'ai',title:'Make AI adoption work for your people.',description:'Let’s discuss human oversight, employee trust and whether an executive workshop or advisory engagement could support your next steps.'},
};

export const INSIGHTS_CONTENT_CTA_OVERRIDES = Object.freeze(Object.fromEntries(
  INSIGHTS_CONTENT_BATCH.map(article => [article.id, {
    ...copy[article.cta],
    bookingLabel:'Book a Call with Christian',
    whatsapp:{
      url:'https://wa.me/971509596182',
      prompt:'Prefer to send a message?',
      label:'WhatsApp',
      message:`Hi Christian, I’ve just read “${article.title}”. I’d like to discuss ${article.topic} for our organisation.`,
    },
  }]),
));
