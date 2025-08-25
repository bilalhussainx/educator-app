/*
 * =================================================================
 * FOLDER: src/components/
 * FILE:   ConceptTagger.tsx (Corrected - Final Enter Key Fix)
 * =================================================================
 * DESCRIPTION: This version adds a keyboard event handler to the input
 * to allow users to create a new concept by pressing the "Enter" key,
 * improving the user experience.
 */
import React, { useState, useEffect } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Badge } from "@/components/ui/badge";
import { X, Lightbulb } from 'lucide-react';
// import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

export interface Concept {
    id: number;
    name: string;
}

export interface TaggedConcept extends Concept {
    mastery_level: number;
}

interface ConceptTaggerProps {
    value: TaggedConcept[];
    onChange: (value: TaggedConcept[]) => void;
}

export const ConceptTagger: React.FC<ConceptTaggerProps> = ({ value, onChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Concept[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const search = async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsLoading(true);
            try {
                const response = await apiClient.get(`/api/concepts/search?query=${searchQuery}`);
                setSearchResults(response.data);
            } catch (error) {
                toast.error("Failed to search for concepts.");
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(() => {
            search();
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleSelect = (concept: Concept) => {
        if (!value.some(c => c.id === concept.id)) {
            onChange([...value, { ...concept, mastery_level: 5 }]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleCreate = async () => {
        if (searchQuery.trim().length < 2) return;
        
        setIsLoading(true);
        try {
            const response = await apiClient.post(`/api/concepts`, { name: searchQuery.trim() });
            handleSelect(response.data);
            toast.success(`Concept "${response.data.name}" created.`);
        } catch (error) {
            toast.error("Could not create concept.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRemove = (conceptId: number) => {
        onChange(value.filter(c => c.id !== conceptId));
    };

    // --- KEY FIX: Add a keyboard handler ---
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // Prevent the default form submission behavior
            e.preventDefault();

            // If there are no search results and the user presses Enter,
            // assume they want to create the new concept.
            if (searchResults.length === 0 && searchQuery.trim().length > 1 && !isLoading) {
                handleCreate();
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <Lightbulb className="text-amber-400 h-5 w-5"/> APE Concepts
                </h3>
                <p className="text-sm text-slate-400">
                    Tag the core concepts this lesson teaches. This is crucial for the AI to generate adaptive follow-ups.
                </p>
            </div>
            
            <div className="min-h-[44px] p-2 border border-slate-700 rounded-lg bg-slate-950 flex flex-wrap gap-2">
                {value.map(concept => (
                    <Badge key={concept.id} variant="secondary" className="text-base py-1 px-3 bg-slate-700 text-slate-200 border-slate-600">
                        {concept.name}
                        <button 
                            type="button" 
                            onClick={() => handleRemove(concept.id)} 
                            className="ml-2 rounded-full hover:bg-slate-500 p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <Command className="rounded-lg border border-slate-600 bg-slate-950 text-white relative">
                <CommandInput 
                    placeholder="Search or create concepts..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    // --- KEY FIX: Attach the new handler ---
                    onKeyDown={handleKeyDown}
                />
                {searchQuery.length > 0 && (
                    <CommandList>
                        <CommandEmpty>
                            {searchQuery.length > 1 && !isLoading && (
                                <CommandItem onSelect={handleCreate} className="text-amber-300">
                                    Create new concept: "{searchQuery}"
                                </CommandItem>
                            )}
                            {isLoading && <div className="p-2 text-sm text-slate-400">Searching...</div>}
                        </CommandEmpty>
                        {searchResults.length > 0 && (
                            <CommandGroup heading="Existing Concepts">
                                {searchResults.map(concept => (
                                    <CommandItem key={concept.id} onSelect={() => handleSelect(concept)}>
                                        {concept.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                )}
            </Command>
        </div>
    );
};