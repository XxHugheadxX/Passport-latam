import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id);

    const companyIds = companies?.map(c => c.id) ?? [];

    if (companyIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .in("company_id", companyIds);

      const productIds = products?.map(p => p.id) ?? [];

      if (productIds.length > 0) {
        const { data: passports } = await supabase
          .from("passports")
          .select("passport_id")
          .in("product_id", productIds);

        const passportIds = passports?.map(p => p.passport_id) ?? [];

        if (passportIds.length > 0) {
          await supabase
            .from("traceability_events")
            .delete()
            .in("passport_id", passportIds);

          await supabase
            .from("passports")
            .delete()
            .in("product_id", productIds);
        }

        await supabase
          .from("products")
          .delete()
          .in("id", productIds);
      }

      await supabase
        .from("companies")
        .delete()
        .in("id", companyIds);
    }

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar cuenta" },
      { status: 500 },
    );
  }
}
