/*
 * =================================================================
 * FOLDER: src/components/
 * FILE:   AdaptiveActionModal.tsx (Final Version - Phase 6)
 * =================================================================
 * DESCRIPTION: This is the master modal component for handling all
 * APE interventions. It conditionally renders different views based
 * on the action type, such as injecting content or presenting a
 * generated problem, with full UI and functionality.
 */
import React, { useState } from 'react';
import type { AdaptiveAction } from '../pages/StudentCoursePage'; // Assuming type is exported from StudentCoursePage
import { Button } from "@/components/ui/button";
import { BrainCircuit, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import apiClient from '../services/apiClient';
import Editor from '@monaco-editor/react';

// Import the Markdown renderer to correctly display formatted text and code
import ReactMarkdown from 'react-markdown';

// --- Type Definitions for Props ---
interface AdaptiveActionModalProps {
    action: AdaptiveAction;
    onClose: () => void;
}

// --- A styled container for all modal content ---
const GlassModalContainer: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
    <div className={cn("fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in-0", className)}>
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700/80 text-white shadow-2xl max-w-2xl w-full animate-in fade-in-0 zoom-in-95">
            {children}
        </div>
    </div>
);


// --- View for "INJECT_FRAGMENT" Action ---
// This component displays remedial text and code examples.
const InjectFragmentView: React.FC<AdaptiveActionModalProps> = ({ action, onClose }) => {
    const fragment = action.details;

    // Fallback UI in case the content fails to load
    if (!fragment) {
        return (
            <GlassModalContainer>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Content Error</h2>
                <p className="text-slate-300">The requested learning fragment could not be loaded.</p>
                <Button onClick={onClose} className="w-full mt-6 bg-slate-600 hover:bg-slate-500 text-white font-bold">Close</Button>
            </GlassModalContainer>
        );
    }
    
    return (
        <GlassModalContainer>
            <div className="border-b border-fuchsia-500/30 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-fuchsia-300 flex items-center gap-3">
                    <BrainCircuit /> A Tip from Your AI Tutor
                </h2>
            </div>
            <h3 className="text-xl font-semibold mb-4 text-slate-100">{fragment.title}</h3>
            
            {/* This div uses Tailwind Typography ('prose') to style the markdown output */}
            <div className="bg-slate-950/50 p-4 rounded-md border border-slate-700 max-h-[50vh] overflow-y-auto prose prose-invert prose-slate">
                {/* This component parses the raw string from the DB and converts it to formatted HTML */}
                <ReactMarkdown>{fragment.content}</ReactMarkdown>
            </div>

            <Button 
                onClick={onClose} 
                className="w-full mt-6 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-bold text-lg py-6"
            >
                Got It, Thanks!
            </Button>
        </GlassModalContainer>
    );
};


// --- View for "GENERATE_PROBLEM" Action ---
// This component displays a mini-IDE for a bespoke challenge.
const GeneratedProblemView: React.FC<AdaptiveActionModalProps> = ({ action, onClose }) => {
    const problem = action.details;
    const [code, setCode] = useState(() => {
        // Safely parse the boilerplate code from the action's details
        try {
            // const boilerplateObject = JSON.parse(problem.boilerplate_code);
            return problem.boilerplate_code['index.js'] || '// Start your code here.';

        } catch {
            return '// Could not load boilerplate code.';
        }
    });
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleVerify = async () => {
        setIsVerifying(true);
        setVerificationResult(null);
        
        try {
            const response = await apiClient.post(`/api/users/actions/solve-problem/${action.id}`, { code });
            setVerificationResult(response.data);

            if (response.data.success) {
                // On success, close the modal after a short delay
                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        } catch (err) {
            setVerificationResult({ success: false, message: 'An error occurred while verifying your solution.' });
        } finally {
            setIsVerifying(false);
        }
    };

    // Fallback UI in case the problem fails to load
    if (!problem) {
        return (
             <GlassModalContainer>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Problem Error</h2>
                <p className="text-slate-300">The requested challenge problem could not be loaded.</p>
                <Button onClick={onClose} className="w-full mt-6 bg-slate-600 hover:bg-slate-500 text-white font-bold">Close</Button>
            </GlassModalContainer>
        );
    }

    return (
        <GlassModalContainer>
             <div className="border-b border-cyan-500/30 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-cyan-300 flex items-center gap-3">
                    <Lightbulb /> A Quick Challenge
                </h2>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-md border border-slate-700 mb-4 prose prose-invert prose-slate max-h-48 overflow-y-auto">
                <ReactMarkdown>{problem.prompt}</ReactMarkdown>
            </div>
            <div className="h-64 rounded-md overflow-hidden border border-slate-700">
                 <Editor
                    height="100%"
                    language="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    options={{ fontSize: 14, minimap: { enabled: false }, scrollbar: { vertical: 'auto' } }}
                />
            </div>

            {verificationResult && (
                 <div className={cn('mt-4 p-3 rounded-md text-center font-semibold animate-in fade-in-0', verificationResult.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300')}>
                    {verificationResult.success ? <CheckCircle className="inline mr-2"/> : <XCircle className="inline mr-2"/>}
                    {verificationResult.message}
                 </div>
            )}

            <Button 
                onClick={handleVerify} 
                disabled={isVerifying}
                className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-lg py-6"
            >
                {isVerifying ? 'Verifying...' : 'Verify Solution'}
            </Button>
        </GlassModalContainer>
    );
};


// --- The Master Modal Component ---
// This component acts as a router, deciding which view to display
// based on the `action_type` provided by the APE.
export const AdaptiveActionModal: React.FC<AdaptiveActionModalProps> = ({ action, onClose }) => {
    switch (action.action_type) {
        case 'INJECT_FRAGMENT':
            return <InjectFragmentView action={action} onClose={onClose} />;
        
        case 'GENERATE_PROBLEM':
            return <GeneratedProblemView action={action} onClose={onClose} />;

        default:
            console.warn(`Unknown adaptive action type encountered: ${action.action_type}`);
            return null; // Render nothing if the action type is not recognized.
    }
};
// /*
//  * =================================================================
//  * FOLDER: src/components/
//  * FILE:   AdaptiveActionModal.tsx (Final Version - Phase 6)
//  * =================================================================
//  * DESCRIPTION: This is the master modal component for handling all
//  * APE interventions. It conditionally renders different views based
//  * on the action type, such as injecting content or presenting a
//  * generated problem.
//  */
// import React, { useState } from 'react';
// import type { AdaptiveAction } from '../pages/StudentCoursePage'; // Assuming type is exported from here
// import { Button } from "@/components/ui/button";
// import { BrainCircuit, BookOpen, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';
// import Editor from '@monaco-editor/react';

// // --- Type Definitions for Props ---
// interface AdaptiveActionModalProps {
//     action: AdaptiveAction;
//     onClose: () => void;
// }

// // --- A styled container for our modal content ---
// const GlassModalContainer: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
//     <div className={cn("fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in-0", className)}>
//         <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700/80 text-white shadow-2xl max-w-2xl w-full animate-in fade-in-0 zoom-in-95">
//             {children}
//         </div>
//     </div>
// );


// // --- View for "INJECT_FRAGMENT" Action ---
// const InjectFragmentView: React.FC<AdaptiveActionModalProps> = ({ action, onClose }) => {
//     const fragment = action.details;

//     if (!fragment) {
//         return (
//             <GlassModalContainer>
//                 <h2 className="text-2xl font-bold text-red-400 mb-4">Content Error</h2>
//                 <p className="text-slate-300">The requested learning fragment could not be loaded.</p>
//                 <Button onClick={onClose} className="w-full mt-6 bg-slate-600 hover:bg-slate-500 text-white font-bold">Close</Button>
//             </GlassModalContainer>
//         );
//     }
    
//     return (
//         <GlassModalContainer>
//             <div className="border-b border-fuchsia-500/30 pb-4 mb-4">
//                 <h2 className="text-2xl font-bold text-fuchsia-300 flex items-center gap-3">
//                     <BrainCircuit /> A Tip from Your AI Tutor
//                 </h2>
//             </div>
//             <h3 className="text-xl font-semibold mb-4 text-slate-100">{fragment.title}</h3>
//             <div className="bg-slate-950/50 p-4 rounded-md border border-slate-700 max-h-[50vh] overflow-y-auto prose prose-invert prose-slate">
//                 <ReactMarkdown>{fragment.content}</ReactMarkdown>
//             </div>
//             <Button 
//                 onClick={onClose} 
//                 className="w-full mt-6 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-bold text-lg py-6"
//             >
//                 Got It, Thanks!
//             </Button>
//         </GlassModalContainer>
//     );
// };


// // --- View for "GENERATE_PROBLEM" Action ---
// const GeneratedProblemView: React.FC<AdaptiveActionModalProps> = ({ action, onClose }) => {
//     const problem = action.details;
//     const [code, setCode] = useState(() => {
//         // Safely parse and get the initial boilerplate code from the action's details
//         try {
//             // The `boilerplate_code` from the DB is a JSON string, so we parse it.
//             const boilerplateObject = JSON.parse(problem.boilerplate_code);
//             // We assume the main file is 'index.js' as defined in our AI prompt.
//             return boilerplateObject['index.js'] || '// Start your code here.';
//         } catch {
//             return '// Could not load boilerplate code.';
//         }
//     });
//     const [isVerifying, setIsVerifying] = useState(false);
//     const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

//     const handleVerify = async () => {
//         setIsVerifying(true);
//         setVerificationResult(null);
//         const token = localStorage.getItem('authToken');
        
//         try {
//             const response = await fetch(`http://localhost:5000/api/actions/solve-problem/${action.id}`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
//                 body: JSON.stringify({ code })
//             });
//             const result = await response.json();
//             setVerificationResult(result);

//             if (result.success) {
//                 // If the solution is correct, close the modal after a short delay for the user to see the success message.
//                 setTimeout(() => {
//                     onClose();
//                 }, 2000);
//             }
//         } catch (err) {
//             setVerificationResult({ success: false, message: 'An error occurred while verifying your solution.' });
//         } finally {
//             setIsVerifying(false);
//         }
//     };

//     if (!problem) {
//         return (
//              <GlassModalContainer>
//                 <h2 className="text-2xl font-bold text-red-400 mb-4">Problem Error</h2>
//                 <p className="text-slate-300">The requested challenge problem could not be loaded.</p>
//                 <Button onClick={onClose} className="w-full mt-6 bg-slate-600 hover:bg-slate-500 text-white font-bold">Close</Button>
//             </GlassModalContainer>
//         );
//     }

//     return (
//         <GlassModalContainer>
//              <div className="border-b border-cyan-500/30 pb-4 mb-4">
//                 <h2 className="text-2xl font-bold text-cyan-300 flex items-center gap-3">
//                     <Lightbulb /> A Quick Challenge
//                 </h2>
//             </div>
//             <div className="bg-slate-950/50 p-4 rounded-md border border-slate-700 mb-4 prose prose-invert prose-slate max-h-48 overflow-y-auto">
//                 <ReactMarkdown>{problem.prompt}</ReactMarkdown>
//             </div>
//             <div className="h-64 rounded-md overflow-hidden border border-slate-700">
//                  <Editor
//                     height="100%"
//                     language="javascript"
//                     theme="vs-dark"
//                     value={code}
//                     onChange={(value) => setCode(value || '')}
//                     options={{ fontSize: 14, minimap: { enabled: false }, scrollbar: { vertical: 'auto' } }}
//                 />
//             </div>

//             {verificationResult && (
//                  <div className={cn('mt-4 p-3 rounded-md text-center font-semibold animate-in fade-in-0', verificationResult.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300')}>
//                     {verificationResult.success ? <CheckCircle className="inline mr-2"/> : <XCircle className="inline mr-2"/>}
//                     {verificationResult.message}
//                  </div>
//             )}

//             <Button 
//                 onClick={handleVerify} 
//                 disabled={isVerifying}
//                 className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-lg py-6"
//             >
//                 {isVerifying ? 'Verifying...' : 'Verify Solution'}
//             </Button>
//         </GlassModalContainer>
//     );
// };


// // --- The Master Modal Component ---
// // This component acts as a router, deciding which view to display
// // based on the `action_type` provided by the APE.
// export const AdaptiveActionModal: React.FC<AdaptiveActionModalProps> = ({ action, onClose }) => {
//     switch (action.action_type) {
//         case 'INJECT_FRAGMENT':
//             return <InjectFragmentView action={action} onClose={onClose} />;
        
//         case 'GENERATE_PROBLEM':
//             return <GeneratedProblemView action={action} onClose={onClose} />;

//         default:
//             console.warn(`Unknown adaptive action type encountered: ${action.action_type}`);
//             return null; // Render nothing if the action type is not recognized.
//     }
// };