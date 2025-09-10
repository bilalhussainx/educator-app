import React from 'react';
import { cn } from "@/lib/utils";
import { Crown, Compass, Map, Zap, Award } from 'lucide-react';

interface TierBadgeProps {
    tier: 'pathfinder' | 'explorer' | 'navigator' | 'ascendant' | 'contributor' | 'standard'; // Support both old and new
    tierName?: string;
    sparks?: number; // Updated from zCredits
    ascendiaScore?: number; // New Ascendia score support
    className?: string;
    showCredits?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const TierBadge: React.FC<TierBadgeProps> = ({ 
    tier, 
    tierName, 
    sparks = 0,
    ascendiaScore,
    className, 
    showCredits = false, 
    size = 'md' 
}) => {
    const getTierConfig = (tierLevel: string) => {
        switch (tierLevel) {
            // NEW ASCENDIA TIERS
            case 'navigator':
                return {
                    icon: Crown,
                    color: 'from-cyan-400 to-blue-500',
                    textColor: 'text-cyan-900',
                    borderColor: 'border-cyan-500/30',
                    bgColor: 'bg-gradient-to-r',
                    name: 'Navigator'
                };
            case 'explorer':
                return {
                    icon: Compass,
                    color: 'from-emerald-400 to-green-500',
                    textColor: 'text-emerald-900',
                    borderColor: 'border-emerald-500/30',
                    bgColor: 'bg-gradient-to-r',
                    name: 'Explorer'
                };
            case 'pathfinder':
                return {
                    icon: Map,
                    color: 'from-amber-400 to-orange-500',
                    textColor: 'text-amber-900',
                    borderColor: 'border-amber-500/30',
                    bgColor: 'bg-gradient-to-r',
                    name: 'Pathfinder'
                };
            // LEGACY TIERS (for backwards compatibility)
            case 'ascendant':
                return {
                    icon: Crown,
                    color: 'from-yellow-400 to-amber-500',
                    textColor: 'text-yellow-900',
                    borderColor: 'border-yellow-500/30',
                    bgColor: 'bg-gradient-to-r',
                    name: 'Ascendant'
                };
            case 'contributor':
                return {
                    icon: Award,
                    color: 'from-blue-400 to-cyan-500',
                    textColor: 'text-blue-900',
                    borderColor: 'border-blue-500/30',
                    bgColor: 'bg-gradient-to-r',
                    name: 'Contributor'
                };
            default:
                return {
                    icon: Map,
                    color: 'from-slate-400 to-slate-500',
                    textColor: 'text-slate-700',
                    borderColor: 'border-slate-500/30',
                    bgColor: 'bg-gradient-to-r',
                    name: 'Standard'
                };
        }
    };

    const config = getTierConfig(tier);
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    };

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full border font-medium",
            config.bgColor,
            config.color,
            config.textColor,
            config.borderColor,
            sizeClasses[size],
            className
        )}>
            <Icon className={iconSizes[size]} />
            <span>{tierName || config.name}</span>
            {showCredits && sparks > 0 && (
                <span className="ml-1 opacity-80 flex items-center gap-0.5">
                    <Zap className="h-3 w-3" />
                    {sparks.toLocaleString()}
                </span>
            )}
            {ascendiaScore && (
                <span className="ml-1 opacity-90 text-xs">
                    {ascendiaScore}
                </span>
            )}
        </div>
    );
};

export default TierBadge;