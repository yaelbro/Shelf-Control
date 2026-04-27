import type { FC } from 'react';
import { Badge, Box, Button, Card, Dropdown, Text } from '@wix/design-system';
import type { CategoryOption } from '../my-page.utils';
import { isWixEntityId } from '../my-page.utils';

type T = (he: string, en: string) => string;

type Props = {
  t: T;
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  categoriesError: string | null;
  productsError: string | null;
  saveStatusMessage: string | null;
  categoryId: string;
  categoryName: string;
  lastLoadedCategoryId: string | null;
  sourceProductsCount: number;
  categoryProductsLoaded: boolean;
  level1Categories: CategoryOption[];
  level2Categories: CategoryOption[];
  level3Categories: CategoryOption[];
  level4Categories: CategoryOption[];
  level5Categories: CategoryOption[];
  selectedLevel1CategoryId: string | undefined;
  selectedLevel2CategoryId: string | undefined;
  selectedLevel3CategoryId: string | undefined;
  selectedLevel4CategoryId: string | undefined;
  selectedLevel5CategoryId: string | undefined;
  setSelectedLevel1CategoryId: (id: string) => void;
  setSelectedLevel2CategoryId: (id: string | undefined) => void;
  setSelectedLevel3CategoryId: (id: string | undefined) => void;
  setSelectedLevel4CategoryId: (id: string | undefined) => void;
  setSelectedLevel5CategoryId: (id: string | undefined) => void;
  setCategoryById: (id: string) => void;
  loadProductsForSelectedCategory: () => void;
};

export const CategorySelectorCard: FC<Props> = ({
  t,
  isLoadingCategories,
  isLoadingProducts,
  categoriesError,
  productsError,
  saveStatusMessage,
  categoryId,
  categoryName,
  lastLoadedCategoryId,
  sourceProductsCount,
  categoryProductsLoaded,
  level1Categories,
  level2Categories,
  level3Categories,
  level4Categories,
  level5Categories,
  selectedLevel1CategoryId,
  selectedLevel2CategoryId,
  selectedLevel3CategoryId,
  selectedLevel4CategoryId,
  selectedLevel5CategoryId,
  setSelectedLevel1CategoryId,
  setSelectedLevel2CategoryId,
  setSelectedLevel3CategoryId,
  setSelectedLevel4CategoryId,
  setSelectedLevel5CategoryId,
  setCategoryById,
  loadProductsForSelectedCategory,
}) => (
  <Card>
    <Box direction="vertical" gap="SP3" padding="SP4">
      <Box direction="horizontal" gap="SP2" verticalAlign="middle" style={{ flexWrap: 'wrap' }}>
        <Text weight="bold">{t('1. בחירת קטגוריה', '1. Select Category')}</Text>
        {isWixEntityId(categoryId) ? (
          <Badge skin="success">{t(`מסדר: ${categoryName}`, `Arranging: ${categoryName}`)}</Badge>
        ) : null}
      </Box>
      <Text size="small" secondary>
        {isLoadingCategories
          ? t('טוען קטגוריות מ-Wix Stores...', 'Loading categories from Wix Stores...')
          : categoriesError ?? (productsError ?? (saveStatusMessage ?? (
            isLoadingProducts
              ? t('טוען מוצרים...', 'Loading products...')
              : isWixEntityId(categoryId) && lastLoadedCategoryId !== categoryId
                ? t('קטגוריה נבחרה — לחץ "טען מוצרים" כדי להמשיך.', 'Category selected — click "Load products" to continue.')
              : !categoryProductsLoaded
                ? t('בחר קטגוריה ולחץ "טען מוצרים" להתחלה.', 'Select a category and click "Load products" to begin.')
              : t(`${sourceProductsCount} מוצרים נטענו לקטגוריה.`, `${sourceProductsCount} products loaded for this category.`)
          )))}
      </Text>

      {(isLoadingCategories || isLoadingProducts) ? (
        <Box direction="vertical" gap="SP2" aria-live="polite">
          <Text size="small" secondary>
            {isLoadingCategories ? t('טוען עץ קטגוריות...', 'Loading category tree...') : t('טוען נתוני מוצרים מהקטגוריה...', 'Loading product data from category...')}
          </Text>
          <div
            style={{
              height: 14,
              width: '45%',
              borderRadius: 6,
              background: 'linear-gradient(90deg, #EEF0F3 25%, #F7F8FA 37%, #EEF0F3 63%)',
              backgroundSize: '400% 100%',
              animation: 'shelfShimmer 1.2s ease-in-out infinite',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`category-loading-${index}`}
                style={{
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(90deg, #EEF0F3 25%, #F7F8FA 37%, #EEF0F3 63%)',
                  backgroundSize: '400% 100%',
                  animation: 'shelfShimmer 1.2s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        </Box>
      ) : null}

      <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>

        <Box direction="vertical" gap="SP1">
          <Box direction="horizontal" gap="SP1" verticalAlign="middle">
            <Text size="small" weight="bold">{t('רמה 1', 'Level 1')}</Text>
            {categoryId === selectedLevel1CategoryId && isWixEntityId(categoryId) ? (
              <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
            ) : null}
          </Box>
          <Dropdown
            placeholder={t('בחר קטגוריה ראשית', 'Select main category')}
            selectedId={selectedLevel1CategoryId}
            options={level1Categories.map(category => ({ id: category.id, value: category.name }))}
            onSelect={option => {
              const selectedId = String(option.id);
              setSelectedLevel1CategoryId(selectedId);
              setSelectedLevel2CategoryId(undefined);
              setSelectedLevel3CategoryId(undefined);
              setSelectedLevel4CategoryId(undefined);
              setSelectedLevel5CategoryId(undefined);
              setCategoryById(selectedId);
            }}
            size="small"
          />
          {selectedLevel1CategoryId && categoryId !== selectedLevel1CategoryId ? (
            <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel1CategoryId) { setCategoryById(selectedLevel1CategoryId); } }}>
              {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
            </Button>
          ) : null}
        </Box>

        <Box direction="vertical" gap="SP1">
          <Box direction="horizontal" gap="SP1" verticalAlign="middle">
            <Text size="small" weight="bold">{t('רמה 2', 'Level 2')}</Text>
            {categoryId === selectedLevel2CategoryId && isWixEntityId(categoryId) ? (
              <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
            ) : null}
          </Box>
          <Dropdown
            placeholder={selectedLevel1CategoryId ? t('בחר קטגוריית בן', 'Select child category') : t('בחר קודם רמה 1', 'Select level 1 first')}
            selectedId={selectedLevel2CategoryId}
            options={level2Categories.map(category => ({ id: category.id, value: category.name }))}
            onSelect={option => {
              const selectedId = String(option.id);
              setSelectedLevel2CategoryId(selectedId);
              setSelectedLevel3CategoryId(undefined);
              setSelectedLevel4CategoryId(undefined);
              setSelectedLevel5CategoryId(undefined);
              setCategoryById(selectedId);
            }}
            size="small"
            disabled={!selectedLevel1CategoryId || level2Categories.length === 0}
          />
          {selectedLevel2CategoryId && categoryId !== selectedLevel2CategoryId ? (
            <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel2CategoryId) { setCategoryById(selectedLevel2CategoryId); } }}>
              {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
            </Button>
          ) : null}
        </Box>

        <Box direction="vertical" gap="SP1">
          <Box direction="horizontal" gap="SP1" verticalAlign="middle">
            <Text size="small" weight="bold">{t('רמה 3', 'Level 3')}</Text>
            {categoryId === selectedLevel3CategoryId && isWixEntityId(categoryId) ? (
              <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
            ) : null}
          </Box>
          <Dropdown
            placeholder={selectedLevel2CategoryId ? t('בחר קטגוריית בן נוספת', 'Select another child category') : t('בחר קודם רמה 2', 'Select level 2 first')}
            selectedId={selectedLevel3CategoryId}
            options={level3Categories.map(category => ({ id: category.id, value: category.name }))}
            onSelect={option => {
              const selectedId = String(option.id);
              setSelectedLevel3CategoryId(selectedId);
              setSelectedLevel4CategoryId(undefined);
              setSelectedLevel5CategoryId(undefined);
              setCategoryById(selectedId);
            }}
            size="small"
            disabled={!selectedLevel2CategoryId || level3Categories.length === 0}
          />
          {selectedLevel3CategoryId && categoryId !== selectedLevel3CategoryId ? (
            <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel3CategoryId) { setCategoryById(selectedLevel3CategoryId); } }}>
              {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
            </Button>
          ) : null}
        </Box>

        <Box direction="vertical" gap="SP1">
          <Box direction="horizontal" gap="SP1" verticalAlign="middle">
            <Text size="small" weight="bold">{t('רמה 4', 'Level 4')}</Text>
            {categoryId === selectedLevel4CategoryId && isWixEntityId(categoryId) ? (
              <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
            ) : null}
          </Box>
          <Dropdown
            placeholder={selectedLevel3CategoryId ? t('בחר קטגוריית בן נוספת', 'Select another child category') : t('בחר קודם רמה 3', 'Select level 3 first')}
            selectedId={selectedLevel4CategoryId}
            options={level4Categories.map(category => ({ id: category.id, value: category.name }))}
            onSelect={option => {
              const selectedId = String(option.id);
              setSelectedLevel4CategoryId(selectedId);
              setSelectedLevel5CategoryId(undefined);
              setCategoryById(selectedId);
            }}
            size="small"
            disabled={!selectedLevel3CategoryId || level4Categories.length === 0}
          />
          {selectedLevel4CategoryId && categoryId !== selectedLevel4CategoryId ? (
            <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel4CategoryId) { setCategoryById(selectedLevel4CategoryId); } }}>
              {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
            </Button>
          ) : null}
        </Box>

        <Box direction="vertical" gap="SP1">
          <Box direction="horizontal" gap="SP1" verticalAlign="middle">
            <Text size="small" weight="bold">{t('רמה 5', 'Level 5')}</Text>
            {categoryId === selectedLevel5CategoryId && isWixEntityId(categoryId) ? (
              <Badge skin="success" size="tiny">{t('פעיל', 'Active')}</Badge>
            ) : null}
          </Box>
          <Dropdown
            placeholder={selectedLevel4CategoryId ? t('בחר קטגוריית בן נוספת', 'Select another child category') : t('בחר קודם רמה 4', 'Select level 4 first')}
            selectedId={selectedLevel5CategoryId}
            options={level5Categories.map(category => ({ id: category.id, value: category.name }))}
            onSelect={option => {
              const selectedId = String(option.id);
              setSelectedLevel5CategoryId(selectedId);
              setCategoryById(selectedId);
            }}
            size="small"
            disabled={!selectedLevel4CategoryId || level5Categories.length === 0}
          />
          {selectedLevel5CategoryId && categoryId !== selectedLevel5CategoryId ? (
            <Button size="tiny" skin="standard" onClick={() => { if (selectedLevel5CategoryId) { setCategoryById(selectedLevel5CategoryId); } }}>
              {t('סדר לפי רמה זו ↑', 'Arrange this level ↑')}
            </Button>
          ) : null}
        </Box>

      </Box>

      <Box direction="horizontal" gap="SP2" verticalAlign="middle">
        <Button
          size="small"
          disabled={!isWixEntityId(categoryId) || isLoadingProducts}
          onClick={loadProductsForSelectedCategory}
        >
          {isLoadingProducts ? t('טוען...', 'Loading...') : t('טען מוצרים', 'Load products')}
        </Button>
        {!isWixEntityId(categoryId) ? (
          <Text size="tiny" secondary>{t('בחר קטגוריה תחילה', 'Select a category first')}</Text>
        ) : null}
      </Box>
    </Box>
  </Card>
);
