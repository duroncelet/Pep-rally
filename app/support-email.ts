export const SUPPORT_EMAIL = 'support@peprally.fun';
export function supportEmailDraft(input: { email: string; rally: string; message: string }) {
 const email=input.email.trim(), rally=input.rally.trim(), message=input.message.trim();
 if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a reply email address.');
 if(rally.length>200)throw new Error('Keep the Rally name or URL under 200 characters.');
 if(message.length<12 || message.length>1000)throw new Error('Describe the problem in 12–1,000 characters.');
 return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Pep Rally support request')}&body=${encodeURIComponent(`Reply email: ${email}\nRally or page: ${rally || '(not specified)'}\n\n${message}`)}`;
}
