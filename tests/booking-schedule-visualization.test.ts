import { describe, expect, it } from "vitest";

import {
  buildBookingCollisionMap,
  filterBookingsForScheduleWindow,
  getBookingScheduleDateKey,
} from "@/lib/bookings/schedule-visualization";

describe("booking schedule visualization", () => {
  it("uses appointment timezone for day bucketing", () => {
    expect(
      getBookingScheduleDateKey({
        id: "booking-1",
        reference_number: null,
        customer_name: null,
        customer_phone: null,
        service_type: null,
        requested_date_text: null,
        requested_time_slot: null,
        bookable_item_id: null,
        resource_id: null,
        start_at: "2026-03-19T00:30:00.000Z",
        end_at: "2026-03-19T01:00:00.000Z",
        appointment_timezone: "America/Los_Angeles",
        status: "confirmed",
        created_at: "2026-03-18T00:00:00.000Z",
        workflow_id: "workflow-1",
        workflow_name: "Default",
        conversation_id: null,
      })
    ).toBe("2026-03-18");
  });

  it("filters the schedule window by appointment-local date", () => {
    const filtered = filterBookingsForScheduleWindow({
      anchorDate: "2026-03-18",
      days: 1,
      entries: [
        {
          id: "booking-1",
          reference_number: null,
          customer_name: null,
          customer_phone: null,
          service_type: null,
          requested_date_text: null,
          requested_time_slot: null,
          bookable_item_id: null,
          resource_id: null,
          start_at: "2026-03-19T00:30:00.000Z",
          end_at: "2026-03-19T01:00:00.000Z",
          appointment_timezone: "America/Los_Angeles",
          status: "confirmed",
          created_at: "2026-03-18T00:00:00.000Z",
          workflow_id: "workflow-1",
          workflow_name: "Default",
          conversation_id: null,
        },
      ],
    });

    expect(filtered.map((entry) => entry.id)).toEqual(["booking-1"]);
  });

  it("detects overlaps on the same schedule lane", () => {
    const collisions = buildBookingCollisionMap([
      {
        id: "booking-1",
        reference_number: null,
        customer_name: null,
        customer_phone: null,
        service_type: null,
        requested_date_text: null,
        requested_time_slot: null,
        bookable_item_id: "service-1",
        resource_id: "resource-a",
        start_at: "2026-03-19T09:00:00.000Z",
        end_at: "2026-03-19T10:00:00.000Z",
        appointment_timezone: "Asia/Bangkok",
        status: "confirmed",
        created_at: "2026-03-18T00:00:00.000Z",
        workflow_id: "workflow-1",
        workflow_name: "Default",
        conversation_id: null,
      },
      {
        id: "booking-2",
        reference_number: null,
        customer_name: null,
        customer_phone: null,
        service_type: null,
        requested_date_text: null,
        requested_time_slot: null,
        bookable_item_id: "service-1",
        resource_id: "resource-a",
        start_at: "2026-03-19T09:30:00.000Z",
        end_at: "2026-03-19T10:30:00.000Z",
        appointment_timezone: "Asia/Bangkok",
        status: "pending",
        created_at: "2026-03-18T00:05:00.000Z",
        workflow_id: "workflow-1",
        workflow_name: "Default",
        conversation_id: null,
      },
      {
        id: "booking-3",
        reference_number: null,
        customer_name: null,
        customer_phone: null,
        service_type: null,
        requested_date_text: null,
        requested_time_slot: null,
        bookable_item_id: "service-1",
        resource_id: "resource-b",
        start_at: "2026-03-19T09:30:00.000Z",
        end_at: "2026-03-19T10:30:00.000Z",
        appointment_timezone: "Asia/Bangkok",
        status: "pending",
        created_at: "2026-03-18T00:05:00.000Z",
        workflow_id: "workflow-1",
        workflow_name: "Default",
        conversation_id: null,
      },
    ]);

    expect(collisions.get("booking-1")?.size).toBe(1);
    expect(collisions.get("booking-2")?.size).toBe(1);
    expect(collisions.has("booking-3")).toBe(false);
  });
});
