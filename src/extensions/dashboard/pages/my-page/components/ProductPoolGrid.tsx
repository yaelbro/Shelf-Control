import type { FC } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Text,
} from '@wix/design-system';

import type { Product } from '../../../types/shelfArrangement';

type ColorModelMeta = {
  groupSize: number;
  position: number;
  baseVariantId: string;
};

type ProductPoolGridProps = {
  productPoolPage: number;
  productPoolTotalPages: number;
  productPoolLength: number;
  sourceProductsLength: number;
  pagedProductPool: Product[];
  pinnedVariantIds: Set<string>;
  getBaseVariantId: (product: Product) => string;
  colorModelMetaByVariantId: Map<string, ColorModelMeta>;
  onPrevPage: () => void;
  onNextPage: () => void;
  title: string;
  subtitle: string;
  paginationSummary: (args: { page: number; totalPages: number; filteredCount: number; totalCount: number }) => string;
  emptyStateLabel: string;
  noImageLabel: string;
  handleLabel: string;
  pinnedLabel: string;
  inStockLabel: string;
  outOfStockLabel: string;
  colorLabel: string;
  colorModelLabel: (args: { position: number; groupSize: number }) => string;
  baseProductLabel: (baseVariantId: string) => string;
  previousLabel: string;
  nextLabel: string;
};

export const ProductPoolGrid: FC<ProductPoolGridProps> = ({
  productPoolPage,
  productPoolTotalPages,
  productPoolLength,
  sourceProductsLength,
  pagedProductPool,
  pinnedVariantIds,
  getBaseVariantId,
  colorModelMetaByVariantId,
  onPrevPage,
  onNextPage,
  title,
  subtitle,
  paginationSummary,
  emptyStateLabel,
  noImageLabel,
  handleLabel,
  pinnedLabel,
  inStockLabel,
  outOfStockLabel,
  colorLabel,
  colorModelLabel,
  baseProductLabel,
  previousLabel,
  nextLabel,
}) => {
  return (
    <Card>
      <Box direction="vertical" gap="SP2" padding="SP4">
        <Text weight="bold">{title}</Text>
        <Text size="small" secondary>{subtitle}</Text>
        <Text size="small" secondary>{paginationSummary({ page: productPoolPage, totalPages: productPoolTotalPages, filteredCount: productPoolLength, totalCount: sourceProductsLength })}</Text>

        {pagedProductPool.length === 0 ? (
          <Text size="small" secondary>{emptyStateLabel}</Text>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {pagedProductPool.map(product => {
              const slug = typeof product.attributes.slug === 'string' ? product.attributes.slug : '';
              const imageUrl = typeof product.attributes.imageUrl === 'string' ? product.attributes.imageUrl : '';
              const baseVariantId = getBaseVariantId(product);
              const colorModelMeta = colorModelMetaByVariantId.get(product.variantId);

              return (
                <Card key={product.variantId}>
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
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Text size="tiny" secondary>{noImageLabel}</Text>
                      )}
                    </div>

                    <Text size="small" weight="bold">{product.name}</Text>
                    <Text size="tiny" secondary>{handleLabel}: {slug || '-'}</Text>

                    <Box direction="horizontal" gap="SP2" style={{ flexWrap: 'wrap' }}>
                      {pinnedVariantIds.has(product.variantId) || pinnedVariantIds.has(baseVariantId)
                        ? <Badge skin="success">{pinnedLabel}</Badge>
                        : null}
                      <Badge skin="neutral">{product.inStock ? inStockLabel : outOfStockLabel}</Badge>
                      {product.color ? <Badge skin="standard">{colorLabel}: {String(product.color)}</Badge> : null}
                      {colorModelMeta && colorModelMeta.groupSize > 1 ? (
                        <Badge skin="premium">{colorModelLabel({ position: colorModelMeta.position, groupSize: colorModelMeta.groupSize })}</Badge>
                      ) : null}
                      {(product.tagNames ?? []).map(tagName => (
                        <Badge key={tagName} skin="neutralLight">{tagName}</Badge>
                      ))}
                    </Box>

                    {colorModelMeta && colorModelMeta.groupSize > 1 ? (
                      <Text size="tiny" secondary>{baseProductLabel(colorModelMeta.baseVariantId)}</Text>
                    ) : null}
                  </Box>
                </Card>
              );
            })}
          </div>
        )}

        <Box direction="horizontal" gap="SP2" verticalAlign="middle">
          <Button
            size="small"
            secondary
            disabled={productPoolPage <= 1}
            onClick={onPrevPage}
          >
            {previousLabel}
          </Button>
          <Button
            size="small"
            secondary
            disabled={productPoolPage >= productPoolTotalPages}
            onClick={onNextPage}
          >
            {nextLabel}
          </Button>
        </Box>
      </Box>
    </Card>
  );
};
