import type { Essay } from "../utils/types.ts";
export declare class EssayRepository {
    findByLink(link: string): Promise<Essay | null>;
    create(essayData: {
        title: string;
        description: string;
        content: string;
        link: string;
    }): Promise<Essay>;
    updateContent(link: string, content: string): Promise<Essay>;
    exists(link: string): Promise<boolean>;
    findAll(): Promise<Essay[]>;
    count(): Promise<number>;
}
export declare const essayRepository: EssayRepository;
//# sourceMappingURL=essayRepository.d.ts.map