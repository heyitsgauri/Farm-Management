import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add the src directory to the path so we can import farm_ai
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from farm_ai.environment.farm_environment import FarmEnvironment
from farm_ai.environment.actions import Action, ActionType

def print_separator():
    print("-" * 32)
    
def print_header(title):
    print("=" * 32)
    print(title.center(32))
    print("=" * 32)

def run_simulation():
    env = FarmEnvironment()
    obs, _ = env.reset()
    state = env.get_dict_state()
    
    print_header("AUTONOMOUS FARM AI")
    
    done = False
    
    # We will just do a simple rule-based script for the 30 days
    # Plant Wheat on Field 0 on Day 1
    # Harvest it when mature
    # Sell it when harvested
    while not done:
        print(f"\nDay: {state['day']} / 30")
        print(f"Cash: ₹{state['cash']:,.2f}")
        
        print("\nFields:")
        for field in state['fields']:
            print(f"Field {field['id']}: {field['state']} " + (f"({field['crop']}) progress: {field['progress']}" if field['state'] != "EMPTY" else ""))
            
        print("\nMarket:")
        for crop, price in state['market_prices'].items():
            print(f"{crop}: ₹{price:,.2f}")
            
        print("\nRisk Forecast:")
        for risk, forecast in state['risk_forecasts'].items():
            print(f"{risk.capitalize()}: {forecast}")
            
        action = Action(ActionType.HOLD)
        
        # Simple Logic
        if state['day'] == 1:
            action = Action(ActionType.PLANT, field_id=0, crop_name="Wheat")
        else:
            # Check if we can harvest
            for field in state['fields']:
                if field['state'] == "MATURE":
                    action = Action(ActionType.HARVEST, field_id=field['id'])
                    break
            
            # If we didn't harvest, check if we have inventory to sell
            if action.type == ActionType.HOLD:
                if state['inventory'].get('Wheat', 0) > 0:
                    action = Action(ActionType.SELL, crop_name="Wheat", quantity=state['inventory']['Wheat'])
                    
        print(f"\nAction:\n{action}")
        print_separator()
        
        obs, reward, done, truncated, info = env.step(action)
        state = env.get_dict_state()
        
    print_header("SEASON RESULTS")
    print(f"Final Cash: ₹{info['final_cash']:,.2f}")
    print(f"Final Wealth: ₹{info['total_wealth']:,.2f}")
    print(f"Profit: ₹{info['profit']:,.2f}")
    print(f"Survived: {'YES' if info['survived'] else 'NO'}")
    print("=" * 32)

if __name__ == "__main__":
    run_simulation()
