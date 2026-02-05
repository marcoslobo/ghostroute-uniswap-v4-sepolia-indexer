import assert from "assert";
import { TestHelpers } from "generated";
const { MockDb, PoolManager, Addresses } = TestHelpers;

describe("Uniswap V4 Pool Tests", () => {
  it("Initialize event should create a new pool", async () => {
    //Instantiate a mock DB
    const mockDb = MockDb.createMockDb();

    //Get mock addresses from helpers
    const currency0Address = Addresses.mockAddresses[0];
    const currency1Address = Addresses.mockAddresses[1];
    const hooksAddress = Addresses.mockAddresses[2];

    //Create a mock Initialize event
    const mockInitialize = PoolManager.Initialize.createMockEvent({
      id: "0x1234567890123456789012345678901234567890123456789012345678901234",
      currency0: currency0Address,
      currency1: currency1Address,
      fee: 3000n,
      tickSpacing: 60n,
      hooks: hooksAddress,
      sqrtPriceX96: 79228162514264337593543950336n,
      tick: 0n,
    });

    //Process the mockEvent
    const mockDbAfterInit = await PoolManager.Initialize.processEvent({
      event: mockInitialize,
      mockDb,
    });

    //Get the pool after initialization
    const pool = mockDbAfterInit.entities.Pool.get(
      "0x1234567890123456789012345678901234567890123456789012345678901234"
    );

    //Assert the pool was created
    assert(pool !== undefined, "Pool should be created");
    assert.equal(
      pool.currency0,
      currency0Address.toLowerCase(),
      "Currency0 should match"
    );
    assert.equal(
      pool.currency1,
      currency1Address.toLowerCase(),
      "Currency1 should match"
    );
    assert.equal(pool.fee, 3000, "Fee should be 3000");
    assert.equal(pool.tickSpacing, 60, "Tick spacing should be 60");
    assert.equal(pool.liquidity, 0n, "Initial liquidity should be 0");
  });
});
