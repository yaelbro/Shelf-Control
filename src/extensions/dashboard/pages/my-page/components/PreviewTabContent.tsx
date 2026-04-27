import type { FC } from 'react';
import { Badge, Box, Card, Divider, Text } from '@wix/design-system';
import type { ArrangementResult, ProductWithMetadata } from '../../../types/shelfArrangement';
import { formatPercentage, formatPrice } from '../../../lib/mockData';

type T = (he: string, en: string) => string;

type Props = {
  t: T;
  livePreviewResult: ArrangementResult;
  top100Preview: ProductWithMetadata[];
};

export const PreviewTabContent: FC<Props> = ({ t, livePreviewResult, top100Preview }) => (
  <Box direction="vertical" gap="SP4">
    <Card>
      <Box direction="vertical" gap="SP2" padding="SP4">
        <Text weight="bold">{t('5. תצוגה מקדימה של הסדר הסופי', '5. Final Arrangement Preview')}</Text>
        <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
          <Badge>{t(`סוננו: ${livePreviewResult.statistics.filteredProducts}`, `Filtered: ${livePreviewResult.statistics.filteredProducts}`)}</Badge>
          <Badge skin="success">{t(`נעוצים: ${livePreviewResult.statistics.pinnedProducts}`, `Pinned: ${livePreviewResult.statistics.pinnedProducts}`)}</Badge>
          <Badge skin="standard">{t(`סופי: ${livePreviewResult.arrangedProducts.length}`, `Final: ${livePreviewResult.arrangedProducts.length}`)}</Badge>
        </Box>

        <Divider />
        {top100Preview.length === 0 ? (
          <Text size="small" secondary>{t('אין מוצרים להצגה בתצוגה המקדימה עבור ההגדרות הנוכחיות.', 'No products to display in preview for current settings.')}</Text>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {top100Preview.map(product => (
              <Card key={`${product.variantId}-${product.sortOrder}`}>
                <Box direction="vertical" gap="SP2" padding="SP2">
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: '#F4F5F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {typeof product.attributes.imageUrl === 'string' && product.attributes.imageUrl ? (
                      <img
                        src={product.attributes.imageUrl}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Text size="tiny" secondary>{t('ללא תמונה', 'No image')}</Text>
                    )}
                  </div>

                  <Box direction="horizontal" align="space-between" verticalAlign="middle">
                    <Badge>#{product.sortOrder + 1}</Badge>
                    {product.isPinned ? <Badge skin="success">{t('נעוץ', 'Pinned')}</Badge> : <Badge skin="neutral">{t('רגיל', 'Regular')}</Badge>}
                  </Box>

                  <Text size="small" weight="bold">{product.name}</Text>
                  <Text size="tiny" secondary>
                    {t(
                      `מחיר: ${formatPrice(product.price)} | מלאי: ${formatPercentage(product.inventoryPercentage)}`,
                      `Price: ${formatPrice(product.price)} | Stock: ${formatPercentage(product.inventoryPercentage)}`,
                    )}
                  </Text>

                  <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                    {product.segmentName ? <Badge skin="standard">{product.segmentName}</Badge> : <Badge skin="neutral">{t('ללא שיוך', 'Unassigned')}</Badge>}
                    {product.pushedToBottom ? <Badge skin="warning">{t('נדחף לתחתית', 'Pushed to bottom')}</Badge> : null}
                  </Box>
                </Box>
              </Card>
            ))}
          </div>
        )}
      </Box>
    </Card>
  </Box>
);
