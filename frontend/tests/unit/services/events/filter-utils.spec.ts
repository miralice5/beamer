import { flushPromises } from '@vue/test-utils';

import { fetchUntilFirstMatchingEvent } from '@/services/events/filter-utils';

const moveTimerToNextTick = async () => {
  await flushPromises();
  vi.advanceTimersToNextTimer();
};
describe('filter-utils', () => {
  beforeEach(() => {
    global.console.error = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fetchUntilFirstMatchingEvent()', () => {
    it('does nothing if block range is negative and returns false', async () => {
      const contract = { queryFilter: vi.fn() };

      const found = await fetchUntilFirstMatchingEvent(contract, {}, 2, 1);

      expect(contract.queryFilter).not.toHaveBeenCalled();
      expect(found).toBe(false);
    });

    it('queries for events multiple times per chunk size', async () => {
      const contract = { queryFilter: vi.fn().mockResolvedValue([]) };

      fetchUntilFirstMatchingEvent(contract, {}, 1, 9, 2);

      expect(contract.queryFilter).toHaveBeenNthCalledWith(1, expect.anything(), 1, 3);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(2, expect.anything(), 4, 6);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(3, expect.anything(), 7, 9);
      await moveTimerToNextTick();
    });

    it('last event query reduces chunk size to match final block number', async () => {
      const contract = { queryFilter: vi.fn().mockResolvedValue([]) };

      fetchUntilFirstMatchingEvent(contract, {}, 1, 5, 2);

      expect(contract.queryFilter).toHaveBeenNthCalledWith(1, expect.anything(), 1, 3);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(2, expect.anything(), 4, 5);
      await moveTimerToNextTick();
    });

    it('returns true if event was found', async () => {
      const contract = { queryFilter: vi.fn().mockResolvedValue(['fake-event']) };

      const found = fetchUntilFirstMatchingEvent(contract, {}, 1, 2);
      await moveTimerToNextTick();

      expect(await found).toBe(true);
    });

    it('returns false if no event was found', async () => {
      const contract = { queryFilter: vi.fn().mockResolvedValue([]) };

      const found = fetchUntilFirstMatchingEvent(contract, {}, 1, 2);

      expect(contract.queryFilter).toHaveBeenCalled();
      await moveTimerToNextTick();

      expect(await found).toBe(false);
    });

    it('stops querying events once an event was found', async () => {
      const contract = {
        queryFilter: vi
          .fn()
          .mockReturnValueOnce([])
          .mockReturnValueOnce(['fake-event'])
          .mockResolvedValue([]),
      };

      fetchUntilFirstMatchingEvent(contract, {}, 1, 9, 2);

      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(1, expect.anything(), 1, 3);
      await moveTimerToNextTick();
      expect(contract.queryFilter).toHaveBeenNthCalledWith(2, expect.anything(), 4, 6);
      await moveTimerToNextTick();
      expect(contract.queryFilter).not.toHaveBeenCalledWith(expect.anything(), 7, 9);
      await moveTimerToNextTick();
    });

    it('reduces the chunk size by half with every error and retries', async () => {
      const contract = {
        queryFilter: vi
          .fn()
          .mockRejectedValueOnce(null)
          .mockRejectedValueOnce(null)
          .mockResolvedValue([]),
      };

      fetchUntilFirstMatchingEvent(contract, {}, 1, 6, 4);

      expect(contract.queryFilter).toHaveBeenNthCalledWith(1, expect.anything(), 1, 5);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(2, expect.anything(), 1, 3);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(3, expect.anything(), 1, 2);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(4, expect.anything(), 3, 4);
      await moveTimerToNextTick();

      expect(contract.queryFilter).toHaveBeenNthCalledWith(5, expect.anything(), 5, 6);
      await moveTimerToNextTick();
    });
  });
});
