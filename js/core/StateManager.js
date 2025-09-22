/**
 * StateManager - Lightweight state management system
 * Provides reactive state updates and component communication
 */

class StateManager {
  constructor(initialState = {}) {
    this.subscribers = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;

    // Create reactive state using Proxy
    this.state = new Proxy(initialState, {
      set: (target, key, value) => {
        const oldValue = target[key];

        // Skip if value hasn't changed
        if (oldValue === value) {
          return true;
        }

        // Apply middleware
        const action = { type: 'SET', key, value, oldValue };
        const processedAction = this.applyMiddleware(action);

        if (processedAction === false) {
          return false; // Prevent state change
        }

        // Update state
        target[key] = processedAction.value;

        // Add to history
        this.addToHistory(processedAction);

        // Notify subscribers
        this.notify(key, processedAction.value, oldValue);

        return true;
      },

      get: (target, key) => {
        return target[key];
      },

      deleteProperty: (target, key) => {
        const oldValue = target[key];
        delete target[key];

        const action = { type: 'DELETE', key, oldValue };
        this.addToHistory(action);
        this.notify(key, undefined, oldValue);

        return true;
      }
    });
  }

  // Subscription management
  subscribe(keyOrPattern, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const subscription = {
      id: this.generateId(),
      keyOrPattern,
      callback,
      options: {
        immediate: false,
        once: false,
        ...options
      }
    };

    if (!this.subscribers.has(keyOrPattern)) {
      this.subscribers.set(keyOrPattern, new Set());
    }

    this.subscribers.get(keyOrPattern).add(subscription);

    // Call immediately with current value if requested
    if (subscription.options.immediate) {
      const currentValue = this.get(keyOrPattern);
      if (currentValue !== undefined) {
        callback(currentValue, undefined);
      }
    }

    // Return unsubscribe function
    return () => this.unsubscribe(subscription.id);
  }

  unsubscribe(subscriptionId) {
    for (const [key, subscriptions] of this.subscribers) {
      for (const subscription of subscriptions) {
        if (subscription.id === subscriptionId) {
          subscriptions.delete(subscription);
          if (subscriptions.size === 0) {
            this.subscribers.delete(key);
          }
          return true;
        }
      }
    }
    return false;
  }

  // Notify subscribers
  notify(key, newValue, oldValue) {
    // Exact key matches
    if (this.subscribers.has(key)) {
      const subscriptions = Array.from(this.subscribers.get(key));
      subscriptions.forEach(subscription => {
        try {
          subscription.callback(newValue, oldValue, key);

          // Remove one-time subscriptions
          if (subscription.options.once) {
            this.unsubscribe(subscription.id);
          }
        } catch (error) {
          console.error('Error in state subscriber:', error);
        }
      });
    }

    // Pattern matches (wildcards)
    for (const [pattern, subscriptions] of this.subscribers) {
      if (pattern !== key && this.matchesPattern(key, pattern)) {
        const subscriptionArray = Array.from(subscriptions);
        subscriptionArray.forEach(subscription => {
          try {
            subscription.callback(newValue, oldValue, key);

            if (subscription.options.once) {
              this.unsubscribe(subscription.id);
            }
          } catch (error) {
            console.error('Error in pattern subscriber:', error);
          }
        });
      }
    }
  }

  // State access methods
  get(key) {
    if (key === undefined) {
      return { ...this.state };
    }
    return this.state[key];
  }

  set(key, value) {
    if (typeof key === 'object' && key !== null) {
      // Batch update
      Object.entries(key).forEach(([k, v]) => {
        this.state[k] = v;
      });
    } else {
      this.state[key] = value;
    }
  }

  update(key, updater) {
    if (typeof updater !== 'function') {
      throw new Error('Updater must be a function');
    }

    const currentValue = this.get(key);
    const newValue = updater(currentValue);
    this.set(key, newValue);
  }

  delete(key) {
    delete this.state[key];
  }

  has(key) {
    return key in this.state;
  }

  // Derived state
  computed(dependencies, computeFn) {
    if (!Array.isArray(dependencies)) {
      dependencies = [dependencies];
    }

    let cachedValue;
    let isInitialized = false;

    const compute = () => {
      const values = dependencies.map(dep => this.get(dep));
      cachedValue = computeFn(...values);
      isInitialized = true;
      return cachedValue;
    };

    // Subscribe to dependencies
    const unsubscribers = dependencies.map(dep =>
      this.subscribe(dep, () => {
        compute();
      })
    );

    return {
      get value() {
        if (!isInitialized) {
          compute();
        }
        return cachedValue;
      },
      destroy() {
        unsubscribers.forEach(unsub => unsub());
      }
    };
  }

  // Middleware support
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
  }

  applyMiddleware(action) {
    return this.middleware.reduce((acc, middleware) => {
      if (acc === false) return false;
      return middleware(acc, this.state);
    }, action);
  }

  // History management
  addToHistory(action) {
    this.history.push({
      ...action,
      timestamp: Date.now()
    });

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  getHistory() {
    return [...this.history];
  }

  // Utility methods
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  matchesPattern(key, pattern) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(key);
    }
    return false;
  }

  // Debugging
  debug() {
    console.group('StateManager Debug');
    console.log('Current State:', this.get());
    console.log('Subscribers:', Array.from(this.subscribers.keys()));
    console.log('History:', this.getHistory());
    console.groupEnd();
  }

  // Persistence
  persist(key = 'stateManager') {
    try {
      localStorage.setItem(key, JSON.stringify(this.get()));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  restore(key = 'stateManager') {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsedState = JSON.parse(stored);
        Object.entries(parsedState).forEach(([k, v]) => {
          this.set(k, v);
        });
      }
    } catch (error) {
      console.warn('Failed to restore state:', error);
    }
  }

  // Batch operations
  batch(operations) {
    const originalNotify = this.notify;
    const batchedNotifications = [];

    // Temporarily replace notify to collect notifications
    this.notify = (key, newValue, oldValue) => {
      batchedNotifications.push({ key, newValue, oldValue });
    };

    try {
      operations();
    } finally {
      // Restore original notify and fire all batched notifications
      this.notify = originalNotify;
      batchedNotifications.forEach(({ key, newValue, oldValue }) => {
        this.notify(key, newValue, oldValue);
      });
    }
  }

  // Reset state
  reset(newState = {}) {
    const oldState = this.get();

    // Clear current state
    Object.keys(oldState).forEach(key => {
      delete this.state[key];
    });

    // Set new state
    Object.entries(newState).forEach(([key, value]) => {
      this.state[key] = value;
    });
  }

  // Cleanup
  destroy() {
    this.subscribers.clear();
    this.middleware.length = 0;
    this.history.length = 0;
  }
}

// Create global instance
export const globalState = new StateManager();

export default StateManager;