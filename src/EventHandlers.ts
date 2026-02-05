import { PoolManager, Pool, Swap, LiquidityModification } from "generated";

// Handler for Initialize event (when a new pool is created)
PoolManager.Initialize.handler(async ({ event, context }) => {
  const poolId = event.params.id;

  const poolObject: Pool = {
    id: poolId,
    currency0: event.params.currency0.toLowerCase(),
    currency1: event.params.currency1.toLowerCase(),
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
