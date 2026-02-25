import { CATEGORIES } from '../lib/categories'
import TopicCard from './TopicCard'

export default function TopicGrid() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {CATEGORIES.map((cat) => (
        <TopicCard key={cat.slug} category={cat} />
      ))}
    </div>
  )
}
