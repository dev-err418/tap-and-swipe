import { RefreshCw } from "lucide-react";

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
}

async function getLatestRelease(): Promise<{ timeAgo: string; version: string } | null> {
    try {
        const res = await fetch(
            "https://api.github.com/repos/dev-err418/app-sprint-aso-releases/releases/latest",
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
            timeAgo: formatTimeAgo(data.published_at),
            version: data.tag_name,
        };
    } catch {
        return null;
    }
}

export default async function AsoLastUpdate() {
    const release = await getLatestRelease();
    if (!release) return null;

    return (
        <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[#f4cf8f] bg-[#f4cf8f]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            <RefreshCw className="h-2.5 w-2.5" />
            Updated {release.timeAgo}
        </span>
    );
}
