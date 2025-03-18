interface Argv {
    number?: number;
    range?: string[];
    subject?: string;
    value?: string;
    script?: string;
    compact?: boolean;
    sha?: string;
    safe?: boolean;
    committer?: boolean;
    gitFilterRepo?: boolean;
    truncate?: boolean;
    message?: string[];
    silent?: boolean;
    rewritten?: Record<string, { subject: string; value: string; index: number }>;
    author_date?: string[];
    author_name?: string[];
    author_email?: string[];
}

export { Argv };