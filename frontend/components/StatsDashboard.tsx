"use client";

import type { GroupStats } from "@/lib/stats";

const memberColors = ["#5f8298", "#4f9d82", "#6f7bb2", "#8a6f9c", "#4d7f95", "#5a5a83"];

function Tile({ k, v, u }: { k: string; v: string | number; u?: string }) {
  return (
    <div className="sd-tile">
      <div className="sd-k">{k}</div>
      <div className="sd-v">
        {v}
        {u && <span className="sd-u">{u}</span>}
      </div>
    </div>
  );
}

export default function StatsDashboard({ stats }: { stats: GroupStats }) {
  const monthMax = Math.max(1, ...stats.by_month.map((m) => m.count));
  const genreMax = Math.max(1, ...stats.by_genre.map((g) => g.count));
  const starMax = Math.max(1, ...stats.star_distribution.map((s) => s.count));

  return (
    <div className="sd">
      <div className="sd-tiles">
        <Tile k="완독한 책" v={stats.books_completed} u="권" />
        <Tile k="쌓인 페이지" v={stats.pages_total.toLocaleString()} u="쪽" />
        <Tile k="평균 별점" v={stats.avg_rating ?? "—"} u={stats.avg_rating != null ? "/5" : undefined} />
        <Tile k="책바퀴 회전수" v={stats.loops} u="바퀴" />
      </div>

      <div className="sd-charts">
        <div className="sd-card">
          <h3>월별 완독</h3>
          <div className="sd-vbars">
            {stats.by_month.length === 0 && <p className="sd-empty">아직 데이터가 없어요</p>}
            {stats.by_month.map((m) => (
              <div key={m.month} className="sd-vbar" title={`${m.month} · ${m.count}권`}>
                <span className="sd-vl">{m.count}</span>
                <span className="sd-col" style={{ height: `${(m.count / monthMax) * 100}%` }} />
                <span className="sd-xl">{m.month.slice(5)}월</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sd-card">
          <h3>장르 분포</h3>
          <div className="sd-hbars">
            {stats.by_genre.length === 0 && <p className="sd-empty">아직 데이터가 없어요</p>}
            {stats.by_genre.map((g) => (
              <div key={g.genre} className="sd-hrow" title={`${g.genre} · ${g.count}권`}>
                <span className="sd-lb">{g.genre}</span>
                <span className="sd-track"><i style={{ width: `${(g.count / genreMax) * 100}%` }} /></span>
                <span className="sd-vn">{g.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sd-card">
          <h3>별점 분포</h3>
          <div className="sd-hbars">
            {stats.star_distribution.map((s) => (
              <div key={s.rating} className="sd-hrow" title={`${s.rating}점 · ${s.count}권`}>
                <span className="sd-lb" style={{ color: "var(--accent)" }}>{"★".repeat(s.rating)}</span>
                <span className="sd-track"><i style={{ width: `${(s.count / starMax) * 100}%` }} /></span>
                <span className="sd-vn">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sd-members">
        {stats.members.map((m, i) => (
          <div key={m.user_id} className="sd-mcard">
            <div className="sd-mtop">
              <span className="sd-mav" style={{ background: memberColors[i % memberColors.length] }}>
                {m.nickname.charAt(0)}
              </span>
              <span className="sd-mname">{m.nickname}</span>
            </div>
            <div className="sd-mstats">
              <div><span className="sd-mv">{m.picks}</span><span className="sd-ml">고른 책</span></div>
              <div><span className="sd-mv">{m.pages_read.toLocaleString()}</span><span className="sd-ml">읽은 페이지</span></div>
              <div><span className="sd-mv">{m.avg_given ?? "—"}</span><span className="sd-ml">준 별점</span></div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .sd-tiles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }
        .sd-tile {
          background: rgba(23, 28, 31, 0.55);
          border: 1px solid var(--line-2);
          border-radius: 14px;
          padding: 20px;
        }
        .sd-k {
          font-family: var(--font-en);
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--dim);
        }
        .sd-v {
          font-family: var(--font-en);
          font-weight: 600;
          font-size: 34px;
          margin-top: 10px;
          line-height: 1;
        }
        .sd-u {
          font-size: 13px;
          color: var(--dim);
          margin-left: 5px;
          font-weight: 300;
        }
        .sd-charts {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 16px;
          margin-top: 24px;
        }
        .sd-card {
          background: rgba(23, 28, 31, 0.55);
          border: 1px solid var(--line-2);
          border-radius: 14px;
          padding: 20px;
        }
        .sd-card h3 {
          font-size: 14px;
          font-weight: 500;
          margin: 0 0 16px;
        }
        .sd-empty {
          font-size: 12.5px;
          color: var(--faint);
        }
        .sd-vbars {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          height: 150px;
        }
        .sd-vbar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          height: 100%;
        }
        .sd-col {
          width: 70%;
          max-width: 34px;
          border-radius: 5px 5px 3px 3px;
          background: linear-gradient(180deg, var(--accent), var(--accent-dim));
          box-shadow: 0 0 16px -4px var(--glow);
          min-height: 3px;
        }
        .sd-xl {
          font-size: 11px;
          color: var(--dim);
        }
        .sd-vl {
          font-family: var(--font-en);
          font-size: 11px;
          color: var(--ink-2);
        }
        .sd-hbars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sd-hrow {
          display: grid;
          grid-template-columns: 74px 1fr auto;
          align-items: center;
          gap: 10px;
        }
        .sd-lb {
          font-size: 12.5px;
          color: var(--ink-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sd-track {
          height: 12px;
          background: var(--bg-3);
          border: 1px solid var(--line-2);
          border-radius: 7px;
          overflow: hidden;
        }
        .sd-track i {
          display: block;
          height: 100%;
          border-radius: 7px;
          background: linear-gradient(90deg, var(--accent-dim), var(--accent));
          box-shadow: 0 0 12px -3px var(--glow);
        }
        .sd-vn {
          font-family: var(--font-en);
          font-size: 12px;
          color: var(--dim);
        }
        .sd-members {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .sd-mcard {
          background: rgba(23, 28, 31, 0.55);
          border: 1px solid var(--line-2);
          border-radius: 14px;
          padding: 18px;
        }
        .sd-mtop {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sd-mav {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0d1512;
          font-weight: 600;
          font-size: 16px;
        }
        .sd-mname {
          font-size: 15px;
          font-weight: 500;
        }
        .sd-mstats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 16px;
        }
        .sd-mv {
          font-family: var(--font-en);
          font-weight: 600;
          font-size: 19px;
          display: block;
        }
        .sd-ml {
          font-size: 11px;
          color: var(--dim);
        }
        @media (max-width: 860px) {
          .sd-charts {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
