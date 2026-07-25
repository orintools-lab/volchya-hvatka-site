import { db } from "@/lib/db/client";
export default async function LogsPage() {
  const logs = await db.auditLog.findMany({ include:{admin:true}, orderBy:{createdAt:"desc"}, take:100 });
  return <><header className="admin-page-head"><div><p>Безопасность</p><h1>Логи</h1></div></header>
    <div className="admin-table">{logs.map((log)=><div className="admin-row" key={log.id}>
      <span>{log.createdAt.toLocaleString("ru-RU")}</span><span>{log.action}</span><span>{log.entity}</span><span>{log.entityId}</span><span>{log.admin?.email ?? "system"}</span>
    </div>)}</div></>;
}
