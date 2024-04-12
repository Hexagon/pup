import { EventEmitter } from "../../lib/common/eventemitter.ts"
import { assert, assertEquals } from "@std/assert"

test("EventEmitter - Add and trigger event listener", () => {
  const eventEmitter = new EventEmitter()
  let called = false

  eventEmitter.on("test", () => {
    called = true
  })

  eventEmitter.emit("test")
  assert(called, "Event listener should be called")
})

test("EventEmitter - Trigger event listener with data", () => {
  const eventEmitter = new EventEmitter()
  let receivedData: string | undefined

  eventEmitter.on<string>("test", (data) => {
    receivedData = data
  })

  eventEmitter.emit("test", "Hello, World!")
  assertEquals(receivedData, "Hello, World!", "Event listener should receive data")
})

test("EventEmitter - Remove event listener", () => {
  const eventEmitter = new EventEmitter()
  let called = false

  const listener = () => {
    called = true
  }

  eventEmitter.on("test", listener)
  eventEmitter.off("test", listener)
  eventEmitter.emit("test")

  assert(!called, "Event listener should not be called after being removed")
})

test("EventEmitter - Multiple listeners for same event", () => {
  const eventEmitter = new EventEmitter()
  let listener1Called = false
  let listener2Called = false

  eventEmitter
    .on("test", () => {
      listener1Called = true
    })
  eventEmitter
    .on("test", () => {
      listener2Called = true
    })

  eventEmitter.emit("test")

  assert(listener1Called, "Listener 1 should be called")
  assert(listener2Called, "Listener 2 should be called")
})

test("EventEmitter - Multiple events with different listeners", () => {
  const eventEmitter = new EventEmitter()
  let testEventCalled = false
  let anotherEventCalled = false

  eventEmitter
    .on("test", () => {
      testEventCalled = true
    })
  eventEmitter
    .on("another", () => {
      anotherEventCalled = true
    })

  eventEmitter.emit("test")
  eventEmitter.emit("another")

  assert(testEventCalled, "Test event listener should be called")
  assert(anotherEventCalled, "Another event listener should be called")
})
