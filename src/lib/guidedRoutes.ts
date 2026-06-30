export type GuidedPaymentStatus = "success" | "failed" | "cancelled";

export const GUIDED_ROUTES = {
  home: "/guided-revamp",
  paymentGateway: "/payment-gateway",
  paymentResult: "/payment-result",
  paymentGatewayScoped: "/guided-revamp/payment-gateway",
  paymentResultScoped: "/guided-revamp/payment-result",
} as const;

interface PaymentGatewayParams {
  paymentIntentId: string;
  bookingReference: string;
}

interface PaymentResultParams extends PaymentGatewayParams {
  status: GuidedPaymentStatus;
  transactionReference?: string;
}

export const isValidGuidedPaymentStatus = (value: string | null): value is GuidedPaymentStatus => {
  return value === "success" || value === "failed" || value === "cancelled";
};

export const buildGuidedPaymentGatewayPath = ({
  paymentIntentId,
  bookingReference,
}: PaymentGatewayParams): string => {
  const params = new URLSearchParams({
    payment_intent: paymentIntentId,
    booking_reference: bookingReference,
  });
  return `${GUIDED_ROUTES.paymentGateway}?${params.toString()}`;
};

export const buildGuidedPaymentResultPath = ({
  status,
  paymentIntentId,
  bookingReference,
  transactionReference,
}: PaymentResultParams): string => {
  const params = new URLSearchParams({
    status,
    payment_intent: paymentIntentId,
    booking_reference: bookingReference,
  });

  if (transactionReference) {
    params.set("transaction_reference", transactionReference);
  }

  return `${GUIDED_ROUTES.paymentResult}?${params.toString()}`;
};
