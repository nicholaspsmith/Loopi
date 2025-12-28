CREATE TABLE "learning_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"mastery_percentage" integer DEFAULT 0 NOT NULL,
	"total_time_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "skill_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"parent_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"depth" integer NOT NULL,
	"path" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"mastery_percentage" integer DEFAULT 0 NOT NULL,
	"card_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"generated_by" varchar(20) DEFAULT 'ai' NOT NULL,
	"curated_source_id" varchar(100),
	"node_count" integer DEFAULT 0 NOT NULL,
	"max_depth" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"regenerated_at" timestamp,
	CONSTRAINT "skill_trees_goal_id_unique" UNIQUE("goal_id")
);
--> statement-breakpoint
CREATE TABLE "topic_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_topic" varchar(200) NOT NULL,
	"original_examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_count" integer DEFAULT 1 NOT NULL,
	"goal_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"has_curated_tree" boolean DEFAULT false NOT NULL,
	CONSTRAINT "topic_analytics_normalized_topic_unique" UNIQUE("normalized_topic")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_key" varchar(50) NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_title" varchar(50) DEFAULT 'Novice' NOT NULL,
	"total_cards_mastered" integer DEFAULT 0 NOT NULL,
	"total_goals_completed" integer DEFAULT 0 NOT NULL,
	"title_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_titles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "flashcards" ALTER COLUMN "conversation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" ALTER COLUMN "message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "skill_node_id" uuid;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "card_type" varchar(20) DEFAULT 'flashcard' NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "card_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_nodes" ADD CONSTRAINT "skill_nodes_tree_id_skill_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."skill_trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_trees" ADD CONSTRAINT "skill_trees_goal_id_learning_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."learning_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;