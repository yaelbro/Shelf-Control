import type { Dispatch, FC, SetStateAction } from 'react';
import { Badge, Box, Button, Card, Divider, Text } from '@wix/design-system';
import type { ArrangementResult, PinnedProduct, ProductWithMetadata } from '../../../types/shelfArrangement';
import { formatPercentage, formatPrice } from '../../../lib/mockData';

type T = (he: string, en: string) => string;

type Props = {
  t: T;
  isLoadingProducts: boolean;
  livePreviewResult: ArrangementResult;
  pinnedPreview: PinnedProduct[];
  pagedPinningProducts: ProductWithMetadata[];
  pinningPage: number;
  pinningTotalPages: number;
  PINNING_PAGE_SIZE: number;
  moveUpInArrangement: (variantId: string) => void;
  moveDownInArrangement: (variantId: string) => void;
  togglePinInPlace: (product: ProductWithMetadata, globalIdx: number) => void;
  setPinningPage: Dispatch<SetStateAction<number>>;
};

export const PinningTabContent: FC<Props> = ({
  t,
  isLoadingProducts,
  livePreviewResult,
  pinnedPreview,
  pagedPinningProducts,
  pinningPage,
  pinningTotalPages,
  PINNING_PAGE_SIZE,
  moveUpInArrangement,
  moveDownInArrangement,
  togglePinInPlace,
  setPinningPage,
}) => (
  <Box direction="vertical" gap="SP4">
    <Card>
      <Box direction="vertical" gap="SP3" padding="SP4">
        <Text weight="bold">{t('3. סידור ונעיצת מוצרים', '3. Arrange and Pin Products')}</Text>
        <Text size="small" secondary>
          {t('כל המוצרים מוצגים לפי סדר הסידור הנוכחי. מוצר לא-נעוץ: "⬆ לראש" מקדם זמנית למעלה ללא נעיצה. "נעץ" נועל מוצר במקומו הנוכחי.', 'All products are shown in the current arrangement order. Non-pinned product: "⬆ To Top" promotes temporarily without pinning. "Pin" locks a product in its current position.')}
        </Text>
        <Text size="small" secondary>
          {pinnedPreview.length > 0
            ? t(`${pinnedPreview.length} מוצרים נעוצים · ${livePreviewResult.arrangedProducts.length} מוצרים בסה"כ`, `${pinnedPreview.length} pinned products · ${livePreviewResult.arrangedProducts.length} total products`)
            : t(`אין מוצרים נעוצים · ${livePreviewResult.arrangedProducts.length} מוצרים בסה"כ`, `No pinned products · ${livePreviewResult.arrangedProducts.length} total products`)}
        </Text>
        <Divider />
        {isLoadingProducts ? (
          <Box direction="vertical" gap="SP2">
            <Text size="small" secondary>{t('טוען מוצרים...', 'Loading products...')}</Text>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`pin-load-${idx}`}
                style={{
                  height: 80,
                  borderRadius: 8,
                  background: 'linear-gradient(90deg,#EEF0F3 25%,#F7F8FA 37%,#EEF0F3 63%)',
                  backgroundSize: '400% 100%',
                  animation: 'shelfShimmer 1.2s ease-in-out infinite',
                }}
              />
            ))}
          </Box>
        ) : livePreviewResult.arrangedProducts.length === 0 ? (
          <Text size="small" secondary>
            {t('טען מוצרים לקטגוריה כדי לנהל נעיצות.', 'Load products for category to manage pinning.')}
          </Text>
        ) : (
          <>
            <Box direction="horizontal" gap="SP2" verticalAlign="middle">
              <Button
                size="small"
                secondary
                disabled={pinningPage <= 1}
                onClick={() => setPinningPage(prev => prev - 1)}
              >
                {t('◀ הקודם', '◀ Previous')}
              </Button>
              <Text size="small">{t(`עמוד ${pinningPage} / ${pinningTotalPages}`, `Page ${pinningPage} / ${pinningTotalPages}`)}</Text>
              <Button
                size="small"
                secondary
                disabled={pinningPage >= pinningTotalPages}
                onClick={() => setPinningPage(prev => prev + 1)}
              >
                {t('הבא ▶', 'Next ▶')}
              </Button>
            </Box>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {pagedPinningProducts.map((product, localIdx) => {
                const globalIdx = (pinningPage - 1) * PINNING_PAGE_SIZE + localIdx;
                const isPinned = product.isPinned;
                const pinnedPos = pinnedPreview.findIndex(p => p.variantId === product.variantId);
                const isFirstPinned = pinnedPos === 0;
                const imageUrl = typeof product.attributes.imageUrl === 'string' ? product.attributes.imageUrl : '';

                return (
                  <div
                    key={product.variantId}
                    style={{
                      border: isPinned ? '2px solid #3899EC' : '1px solid #DFE5EB',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: isPinned ? '#EAF4FF' : '#F4F5F7',
                        borderBottom: '1px solid #DFE5EB',
                      }}
                    >
                      <Text size="tiny" weight="bold">{`#${globalIdx + 1}`}</Text>
                      {isPinned ? <Badge skin="success">{t(`נעוץ #${pinnedPos + 1}`, `Pinned #${pinnedPos + 1}`)}</Badge> : null}
                    </div>

                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        overflow: 'hidden',
                        background: '#F4F5F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Text size="tiny" secondary>{t('ללא תמונה', 'No image')}</Text>
                      )}
                    </div>

                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <Text size="small" weight="bold" style={{ wordBreak: 'break-word' }}>{product.name}</Text>
                      <Text size="tiny" secondary>{`Handle: ${typeof product.attributes.slug === 'string' ? product.attributes.slug : product.sku}`}</Text>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Text size="tiny" weight="bold">{t(`מחיר: ${formatPrice(product.price)}`, `Price: ${formatPrice(product.price)}`)}</Text>
                        {product.priceBeforeDiscount ? (
                          <Text size="tiny" secondary style={{ textDecoration: 'line-through' }}>
                            {t(`מחיר קודם: ${formatPrice(product.priceBeforeDiscount)}`, `Previous price: ${formatPrice(product.priceBeforeDiscount)}`)}
                          </Text>
                        ) : null}
                        {product.priceMax ? (
                          <Text size="tiny" secondary>{t(`מחיר מקסימלי: ${formatPrice(product.priceMax)}`, `Max price: ${formatPrice(product.priceMax)}`)}</Text>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Badge skin={product.inStock ? 'success' : 'danger'}>
                          {product.inStock ? t(`מלאי: ${product.inventory}`, `Stock: ${product.inventory}`) : t('אזל מהמלאי', 'Out of stock')}
                        </Badge>
                        {product.color ? <Badge skin="standard">{String(product.color)}</Badge> : null}
                      </div>
                      {(product.tagNames ?? []).length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(product.tagNames ?? []).map(tagName => (
                            <Badge key={tagName} skin="neutralLight">{tagName}</Badge>
                          ))}
                        </div>
                      ) : null}
                      <Text size="tiny" secondary>
                        {t(
                          `וריאנטים במלאי: ${formatPercentage(Number(product.attributes.variantAvailabilityPercentage ?? 0))}`,
                          `In-stock variants: ${formatPercentage(Number(product.attributes.variantAvailabilityPercentage ?? 0))}`,
                        )}
                      </Text>
                    </div>

                    <div
                      style={{
                        padding: '6px 10px',
                        display: 'flex',
                        gap: 4,
                        borderTop: '1px solid #DFE5EB',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Button
                        size="tiny"
                        skin="standard"
                        disabled={isPinned && isFirstPinned}
                        onClick={() => moveUpInArrangement(product.variantId)}
                      >
                        {isPinned ? t('↑ קדם', '↑ Promote') : t('⬆ לראש', '⬆ To Top')}
                      </Button>
                      <Button
                        size="tiny"
                        skin="standard"
                        disabled={!isPinned}
                        onClick={() => moveDownInArrangement(product.variantId)}
                      >
                        {t('↓ הורד', '↓ Demote')}
                      </Button>
                      <Button
                        size="tiny"
                        skin={isPinned ? 'light' : 'standard'}
                        onClick={() => togglePinInPlace(product, globalIdx)}
                      >
                        {isPinned ? t('שחרר', 'Unpin') : t('נעץ', 'Pin')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Box direction="horizontal" gap="SP2">
              <Button
                size="small"
                secondary
                disabled={pinningPage <= 1}
                onClick={() => setPinningPage(prev => prev - 1)}
              >
                {t('◀ הקודם', '◀ Previous')}
              </Button>
              <Button
                size="small"
                secondary
                disabled={pinningPage >= pinningTotalPages}
                onClick={() => setPinningPage(prev => prev + 1)}
              >
                {t('הבא ▶', 'Next ▶')}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Card>
  </Box>
);
