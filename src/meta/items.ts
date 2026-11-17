export interface ItemInfo {
    id: string;
    name: string;
    description: string;
    price: number;
}

export const ITEMS: ItemInfo[] = [
    {
        id: 'hair', name: 'Парик',
        description: 'Новый кудрявый парик. Наверное можно замаскироваться и тебя не заметят', price: 250
    },
    {
        id: 'coca_tea', name: 'Необычный отвар',
        description: 'Состав неизвестен. Пробовать на вкус крайне не рекомендуется', price: 150
    },
    {
        id: 'chatgpt_pro', name: 'Подписка на ChatGPT',
        description: 'Кто-то из студентов не вышел из аккаунта и он пошёл по рукам', price: 120
    },
    {
        id: 'chalk', name: 'Школьный мел',
        description: 'Новый белый кусочек мела', price: 100
    },
    {
        id: 'burn', name: 'Энергетик Burn',
        description: 'Новый энергетик Burn, только из холодильника. Восстанавливает 70% энергии', price: 250
    },
    {
        id: 'monster', name: 'Энергетик Monster',
        description: 'Энергетик Monster, мечта бедных студентов. Восстанавливает 100% энергии', price: 375
    },
    {
        id: 'pass_skip', name: 'Справка о больничном',
        description: 'Записка подтвержающая отсутствие. Пропускает 1 час ночи', price: -1
    },
    {
        id: 'koshkina_skip', name: 'Записка с приглашением',
        description: 'Записка от Анастасии Алексеевны Кошкиной с приглашением. Пропускает 3 часа ночи, можно использовать до 3 часов ночи', price: -1
    }
];

export const ITEM_NAMES: Record<string, string> = Object.fromEntries(
    ITEMS.map(item => [item.id, item.name])
);

export const ITEM_ORDER: string[] = ITEMS.map(item => item.id);