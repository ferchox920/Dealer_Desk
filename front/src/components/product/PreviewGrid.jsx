import { formatBytes } from '@/utils/formatters';
import styles from '@/components/product/PreviewGrid.module.css';

export function PreviewGrid({ emptyMessage, items }) {
  if (items.length === 0) {
    return (
      <div className={[styles.grid, styles['grid--empty']].join(' ')}>
        <p className="muted-text">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <article className={styles.card} key={item.id}>
          <img alt={item.name} className={styles.image} src={item.url} />
          <div className={styles.body}>
            <strong className={styles.title}>{item.name}</strong>
            <p className={styles.meta}>{formatBytes(item.size)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
