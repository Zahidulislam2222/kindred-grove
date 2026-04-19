import {
  reactExtension,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  useSettings,
  useTranslate,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension('purchase.checkout.block.render', () => <TrustBadges />);

interface Settings {
  show_halal?: boolean;
  show_shipping?: boolean;
  show_returns?: boolean;
}

function TrustBadges() {
  const translate = useTranslate();
  const settings = useSettings() as Settings;

  const showHalal = settings.show_halal !== false;
  const showShipping = settings.show_shipping !== false;
  const showReturns = settings.show_returns !== false;

  if (!showHalal && !showShipping && !showReturns) return null;

  return (
    <BlockStack spacing="tight" border="base" cornerRadius="base" padding="base">
      <Text emphasis="bold">{translate('heading')}</Text>
      <InlineStack spacing="base" blockAlignment="center">
        {showHalal && (
          <InlineStack spacing="extraTight" blockAlignment="center">
            <Icon source="checkmark" />
            <Text size="small">{translate('halal')}</Text>
          </InlineStack>
        )}
        {showShipping && (
          <InlineStack spacing="extraTight" blockAlignment="center">
            <Icon source="delivered" />
            <Text size="small">{translate('shipping')}</Text>
          </InlineStack>
        )}
        {showReturns && (
          <InlineStack spacing="extraTight" blockAlignment="center">
            <Icon source="refresh" />
            <Text size="small">{translate('returns')}</Text>
          </InlineStack>
        )}
      </InlineStack>
    </BlockStack>
  );
}
