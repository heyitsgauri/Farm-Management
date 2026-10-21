class RewardCalculator:
    """Calculates rewards for the farm environment.

    Two reward signals are provided:

    calculate_shaped_reward():
        Used by the main step() method (for PPO and all agents).
        Reward = Δ(total wealth)  so planting, growing, harvesting and selling
        are all rewarded through the change in (cash + inventory value).
        Invalid actions receive a fixed penalty instead.

    calculate_reward():
        Legacy cash-only reward — kept for backward compatibility with tests.
    """

    INVALID_ACTION_PENALTY: float = -50.0

    @staticmethod
    def calculate_shaped_reward(
        prev_wealth: float,
        curr_wealth: float,
        valid_action: bool = True,
    ) -> float:
        """Returns Δwealth reward, or a fixed penalty for invalid actions.

        Using Δwealth (cash + inventory value) rather than Δcash alone means
        that planting a crop (which reduces cash but adds potential inventory
        value) does not always receive a negative reward.  This gives PPO a
        much cleaner learning signal.

        Args:
            prev_wealth: Total wealth (cash + inventory value) before the step.
            curr_wealth: Total wealth after the step.
            valid_action: False if the action raised a ValueError.

        Returns:
            Scalar float reward.
        """
        if not valid_action:
            return RewardCalculator.INVALID_ACTION_PENALTY

        return float(curr_wealth - prev_wealth)

    @staticmethod
    def calculate_reward(
        previous_cash: float,
        current_cash: float,
        valid_action: bool = True,
    ) -> float:
        """Legacy cash-only reward (kept for backward compatibility).

        Args:
            previous_cash: Cash before the step.
            current_cash: Cash after the step.
            valid_action: False if the action was invalid.

        Returns:
            Scalar float reward.
        """
        if not valid_action:
            return RewardCalculator.INVALID_ACTION_PENALTY

        return float(current_cash - previous_cash)
