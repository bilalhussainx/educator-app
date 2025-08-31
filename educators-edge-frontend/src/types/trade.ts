
export interface PortfolioAsset {
  asset_symbol: string;
  quantity: string; // The database DECIMAL type often comes back as a string
  average_cost_basis: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  cash_balance: string;
  assets: PortfolioAsset[];
  // We will add p_score, etc., here in the future
}