export interface Department {
    id: string;
    name: string;
    classRange: {
        start: number;
        end: number;
    };
}

export interface SchoolConfig {
    schoolName: string;
    region: string;
    schoolLevel: 'elementary' | 'middle' | 'high';
    contactEmail: string;
    kakaoId?: string;
    grades: number[];
    departments: Department[];
}

const DEFAULT_CONFIG: SchoolConfig = {
    schoolName: '가통고등학교',
    region: '서울',
    schoolLevel: 'high',
    contactEmail: 'admin@gatong.hs.kr',
    grades: [1, 2, 3],
    departments: [
        { id: 'iot', name: 'IoT전기과', classRange: { start: 1, end: 3 } },
        { id: 'game', name: '게임콘텐츠과', classRange: { start: 4, end: 6 } }
    ]
};

export const getSchoolConfig = (): SchoolConfig => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    const stored = localStorage.getItem('school_config');
    return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
};

export const saveSchoolConfig = (config: SchoolConfig) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('school_config', JSON.stringify(config));
};
