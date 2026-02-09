export interface FormItem {
    id: string;
    type: 'select' | 'radio' | 'text' | 'checkbox' | 'signature';
    label: string;
    options?: string[];
    required: boolean;
}

export interface SurveyPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    items: Omit<FormItem, 'id'>[];
}

export const SURVEY_PRESETS: SurveyPreset[] = [
    {
        id: 'participation',
        name: '참가 신청형',
        description: '체험학습, 캠프 등 참가 여부와 사유를 조사합니다.',
        icon: 'CheckCircle2',
        items: [
            { type: 'radio', label: '참가 여부', options: ['참가', '불참'], required: true },
            { type: 'text', label: '불참 사유 (불참 시 작성)', required: false }
        ]
    },
    {
        id: 'health_allergy',
        name: '건강/알레르기 조사',
        description: '급식 및 안전을 위한 보건 실태를 조사합니다.',
        icon: 'Stethoscope',
        items: [
            { type: 'radio', label: '식품 알레르기 유무', options: ['있음', '없음'], required: true },
            {
                type: 'checkbox',
                label: '해당되는 알레르기 유발 식품 (있는 경우)',
                options: [
                    '난류(달걀)', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우',
                    '돼지고기', '복숭아', '토마토', '아황산염', '호두', '닭고기', '쇠고기',
                    '오징어', '조개류(굴, 전복, 홍합 포함)', '잣'
                ],
                required: false
            },
            { type: 'text', label: '기타 특이사항 및 건강상태', required: false }
        ]
    },
    {
        id: 'emergency_contact',
        name: '비상 연락망',
        description: '응급상황 대비 보호자 연락처를 수집합니다.',
        icon: 'Phone',
        items: [
            { type: 'text', label: '보호자 성함', required: true },
            { type: 'text', label: '학생과의 관계 (예: 부, 모, 조부 등)', required: true },
            { type: 'text', label: '비상 연락처', required: true }
        ]
    },
    {
        id: 'school_trip',
        name: '수학여행/희망지 조사',
        description: '희망하는 목적지나 활동 코스를 조사합니다.',
        icon: 'Map',
        items: [
            { type: 'radio', label: '수학여행 참가 여부', options: ['참가', '불참'], required: true },
            { type: 'radio', label: '희망 지역', options: ['제주도', '에버랜드/수도권', '강원도', '기타'], required: true },
            { type: 'text', label: '불참 사유 및 기타 의견', required: false }
        ]
    },
    {
        id: 'privacy_consent',
        name: '개인정보 활용 동의',
        description: '조사 및 통계 활용을 위한 법적 동의를 받습니다.',
        icon: 'ShieldCheck',
        items: [
            {
                type: 'checkbox',
                label: '개인정보 수집 및 이용에 동의하십니까?',
                options: ['동의함', '동의하지 않음'],
                required: true
            }
        ]
    }
];
