"use client";

import { Form, InputNumber, Modal, Select, TimePicker, DatePicker, Alert } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect } from "react";

import type { ShiftRecord } from "@/modules/shifts/types";
import type { RoleRequirements } from "@/types";

export interface ShiftFormValues {
  date: Dayjs;
  startTime: Dayjs;
  endTime: Dayjs;
  overnight: boolean;
  doctor: number;
  nurse: number;
  receptionist: number;
}

export interface ShiftFormSubmit {
  date: string;
  startTime: string;
  endTime: string;
  requirements: RoleRequirements;
}

interface ShiftFormModalProps {
  open: boolean;
  shift: ShiftRecord | null;
  submitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (values: ShiftFormSubmit) => void;
}

const TIME_FORMAT = "HH:mm";

function toDayjsTime(value: string): Dayjs {
  return dayjs(value.replace("+1", ""), TIME_FORMAT);
}

export function ShiftFormModal({
  open,
  shift,
  submitting,
  errorMessage,
  onCancel,
  onSubmit,
}: ShiftFormModalProps) {
  const [form] = Form.useForm<ShiftFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (shift) {
      form.setFieldsValue({
        date: dayjs(shift.date, "YYYY-MM-DD"),
        startTime: toDayjsTime(shift.startTime),
        endTime: toDayjsTime(shift.endTime),
        overnight: shift.endTime.endsWith("+1"),
        doctor: shift.requirements.doctor,
        nurse: shift.requirements.nurse,
        receptionist: shift.requirements.receptionist,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
        startTime: dayjs("09:00", TIME_FORMAT),
        endTime: dayjs("17:00", TIME_FORMAT),
        overnight: false,
        doctor: 0,
        nurse: 1,
        receptionist: 0,
      });
    }
  }, [open, shift, form]);

  return (
    <Modal
      open={open}
      title={shift ? "Edit shift" : "Create shift"}
      okText={shift ? "Save changes" : "Create shift"}
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {errorMessage && (
        <Alert type="error" showIcon title={errorMessage} style={{ marginBottom: 16 }} />
      )}

      {shift && shift.filled.doctor + shift.filled.nurse + shift.filled.receptionist > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="This shift already has claims"
          description="Saving re-checks every claim against the new times and requirements. Claims that no longer fit are released, and you will see exactly who was dropped and why."
        />
      )}

      <Form<ShiftFormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => {
          const endSuffix = values.overnight ? "+1" : "";
          onSubmit({
            date: values.date.format("YYYY-MM-DD"),
            startTime: values.startTime.format(TIME_FORMAT),
            endTime: `${values.endTime.format(TIME_FORMAT)}${endSuffix}`,
            requirements: {
              doctor: values.doctor ?? 0,
              nurse: values.nurse ?? 0,
              receptionist: values.receptionist ?? 0,
            },
          });
        }}
      >
        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: "Date is required" }]}
        >
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
        </Form.Item>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Form.Item
            name="startTime"
            label="Start time"
            style={{ flex: "1 1 140px" }}
            rules={[{ required: true, message: "Start time is required" }]}
          >
            <TimePicker style={{ width: "100%" }} format={TIME_FORMAT} minuteStep={15} />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="End time"
            style={{ flex: "1 1 140px" }}
            rules={[{ required: true, message: "End time is required" }]}
          >
            <TimePicker style={{ width: "100%" }} format={TIME_FORMAT} minuteStep={15} />
          </Form.Item>
        </div>

        <Form.Item
          name="overnight"
          label="End day"
          tooltip="An end time earlier than the start already rolls to the next day. Use this for a full extra day, e.g. 08:00 to 10:00 the following morning."
        >
          <Select
            options={[
              { value: false, label: "Same day (or next morning if earlier)" },
              { value: true, label: "Explicitly next day (+1)" },
            ]}
          />
        </Form.Item>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Form.Item name="doctor" label="Doctors" style={{ flex: "1 1 96px" }}>
            <InputNumber min={0} max={50} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="nurse" label="Nurses" style={{ flex: "1 1 96px" }}>
            <InputNumber min={0} max={50} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="receptionist" label="Receptionists" style={{ flex: "1 1 96px" }}>
            <InputNumber min={0} max={50} style={{ width: "100%" }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
