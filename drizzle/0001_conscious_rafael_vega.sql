CREATE TABLE "rate_limits" (
	"device_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"last_call_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limits_device_id_scope_pk" PRIMARY KEY("device_id","scope")
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;