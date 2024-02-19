"use server";

import { LogEvents } from "@midday/events/events";
import { logsnag } from "@midday/events/server";
import { getTransactions, transformTransactions } from "@midday/gocardless";
import { scheduler } from "@midday/jobs";
import { processPromisesBatch } from "@midday/jobs/src/utils";
import { getUser } from "@midday/supabase/cached-queries";
import { createBankAccounts } from "@midday/supabase/mutations";
import { createClient } from "@midday/supabase/server";
import { revalidateTag } from "next/cache";
import { action } from "./safe-action";
import { connectBankAccountSchema } from "./schema";

export const connectBankAccountAction = action(
  connectBankAccountSchema,
  async (accounts) => {
    const user = await getUser();
    const supabase = createClient();
    const teamId = user.data.team_id;

    const { data } = await createBankAccounts(supabase, accounts);

    const promises = data?.map(async (account) => {
      // Fetch transactions for each account
      const { transactions } = await getTransactions({
        accountId: account.account_id,
      });

      // Schedule sync for each account
      await scheduler.register(account.id, {
        type: "interval",
        options: {
          seconds: 3600, // every 1h
        },
      });

      // Update bank account last_accessed
      await supabase
        .from("bank_accounts")
        .update({
          last_accessed: new Date().toISOString(),
        })
        .eq("id", account.id);

      const formattedTransactions = transformTransactions(
        transactions?.booked,
        {
          accountId: account.id, // Bank account row id
          teamId,
        }
      );

      await processPromisesBatch(formattedTransactions, 500, async (batch) => {
        const { data } = await supabase
          .from("decrypted_transactions")
          .upsert(batch, {
            onConflict: "internal_id",
            ignoreDuplicates: true,
          })
          .select("*, name:decrypted_name");

        return data;
      });

      return;
    });

    await Promise.all(promises);

    revalidateTag(`bank_connections_${teamId}`);
    revalidateTag(`transactions_${teamId}`);
    revalidateTag(`spending_${teamId}`);
    revalidateTag(`metrics_${teamId}`);

    logsnag.track({
      event: LogEvents.ConnectBankCompleted.name,
      icon: LogEvents.ConnectBankCompleted.icon,
      user_id: user.data.email,
      channel: LogEvents.ConnectBankCompleted.channel,
    });

    return;
  }
);
