import { PoolManager, Pool, Swap, LiquidityModification, Token } from "generated";

/**
 * Busca metadados ERC20 de um token.
 * Retorna valores fallback se o contrato não implementar ERC20 corretamente.
 */
async function getTokenMetadata(
  tokenAddress: string,
  chainId: number,
  context: any
): Promise<{ symbol: string; decimals: number; name?: string }> {
  // Por enquanto, retornaremos valores fallback
  // TODO: Implementar contract calls com viem quando a API estiver disponível
  context.log.debug("Fetching token metadata (fallback mode)", { tokenAddress });

  // Gerar um símbolo baseado no endereço para facilitar identificação
  const shortAddr = tokenAddress.slice(2, 8).toUpperCase();

  return {
    symbol: `TOKEN_${shortAddr}`,
    decimals: 18,
    name: `Token ${tokenAddress.slice(0, 10)}...`,
  };
}

// Handler for Initialize event (when a new pool is created)
PoolManager.Initialize.handler(async ({ event, context }) => {
  const poolId = event.params.id;
  const currency0 = event.params.currency0.toLowerCase();
  const currency1 = event.params.currency1.toLowerCase();

  // Buscar ou criar Token para currency0
  let token0 = await context.Token.get(currency0);
  if (!token0) {
    context.log.debug("Creating token0", { address: currency0 });

    const metadata0 = await getTokenMetadata(currency0, event.chainId, context);

    token0 = {
      id: currency0,
      symbol: metadata0.symbol,
      decimals: metadata0.decimals,
      name: metadata0.name,
    };
    context.Token.set(token0);
  }

  // Buscar ou criar Token para currency1
  let token1 = await context.Token.get(currency1);
  if (!token1) {
    context.log.debug("Creating token1", { address: currency1 });

    const metadata1 = await getTokenMetadata(currency1, event.chainId, context);

    token1 = {
      id: currency1,
      symbol: metadata1.symbol,
      decimals: metadata1.decimals,
      name: metadata1.name,
    };
    context.Token.set(token1);
  }

  // Criar pool com relacionamentos de tokens
  const poolObject: Pool = {
    id: poolId,
    // Manter addresses originais para backwards compatibility
    currency0: currency0,
    currency1: currency1,
    // Adicionar foreign keys para tokens
    token0_id: token0.id,
    token1_id: token1.id,
    fee: Number(event.params.fee),
    tickSpacing: Number(event.params.tickSpacing),
    hooks: event.params.hooks.toLowerCase(),
    sqrtPriceX96: event.params.sqrtPriceX96,
    tick: Number(event.params.tick),
    liquidity: 0n,
    createdAtBlockNumber: BigInt(event.block.number),
    createdAtTimestamp: BigInt(event.block.timestamp),
  };

  context.Pool.set(poolObject);

  context.log.info("Pool initialized with tokens", {
    poolId,
    token0Symbol: token0.symbol,
    token1Symbol: token1.symbol,
  });
});

// Handler for Swap event
PoolManager.Swap.handler(async ({ event, context }) => {
  const poolId = event.params.id;
  const swapId = event.transaction.hash + "-" + event.logIndex.toString();

  // Update pool state
  let pool = await context.Pool.get(poolId);
  if (pool !== undefined) {
    const updatedPool: Pool = {
      ...pool,
      sqrtPriceX96: event.params.sqrtPriceX96,
      tick: Number(event.params.tick),
      liquidity: event.params.liquidity,
    };
    context.Pool.set(updatedPool);
  }

  // Create swap entity
  const swapObject: Swap = {
    id: swapId,
    pool_id: poolId,
    sender: event.params.sender.toLowerCase(),
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    sqrtPriceX96: event.params.sqrtPriceX96,
    liquidity: event.params.liquidity,
    tick: Number(event.params.tick),
    fee: Number(event.params.fee),
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  context.Swap.set(swapObject);
});

// Handler for ModifyLiquidity event
PoolManager.ModifyLiquidity.handler(async ({ event, context }) => {
  const poolId = event.params.id;
  const modificationId = event.transaction.hash + "-" + event.logIndex.toString();

  // Update pool liquidity
  let pool = await context.Pool.get(poolId);
  if (pool !== undefined) {
    const newLiquidity = pool.liquidity + event.params.liquidityDelta;
    const updatedPool: Pool = {
      ...pool,
      liquidity: newLiquidity > 0n ? newLiquidity : 0n,
    };
    context.Pool.set(updatedPool);
  }

  // Create liquidity modification entity
  const liquidityModObject: LiquidityModification = {
    id: modificationId,
    pool_id: poolId,
    sender: event.params.sender.toLowerCase(),
    tickLower: Number(event.params.tickLower),
    tickUpper: Number(event.params.tickUpper),
    liquidityDelta: event.params.liquidityDelta,
    salt: event.params.salt,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  context.LiquidityModification.set(liquidityModObject);
});
