import WidgetKit
import SwiftUI

struct WidgetData: Codable {
    let remaining_cards: Int
    let last_result_card: String
    let last_result_status: String
    let is_running: Bool
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: WidgetData(remaining_cards: 0, last_result_card: "None", last_result_status: "N/A", is_running: false))
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = loadData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = loadData()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func loadData() -> SimpleEntry {
        let filePath = "/Users/adminuser/vsc/cc_checker/widget_data.json"
        if let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
           let decoded = try? JSONDecoder().decode(WidgetData.self, from: data) {
            return SimpleEntry(date: Date(), data: decoded)
        }
        return SimpleEntry(date: Date(), data: WidgetData(remaining_cards: 0, last_result_card: "None", last_result_status: "N/A", is_running: false))
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct CCCheckerWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(.blue)
                Text("CC Checker")
                    .font(.headline)
            }
            
            Divider()
            
            VStack(alignment: .leading) {
                Text("Remaining")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("\(entry.data.remaining_cards)")
                    .font(.title2)
                    .bold()
            }
            
            VStack(alignment: .leading) {
                Text("Last Result")
                    .font(.caption)
                    .foregroundColor(.secondary)
                HStack {
                    Text(entry.data.last_result_card)
                    Spacer()
                    Text(entry.data.last_result_status)
                        .foregroundColor(entry.data.last_result_status == "SUCCESS" ? .green : .red)
                        .bold()
                }
                .font(.footnote)
            }
            
            if entry.data.is_running {
                Text("● Running")
                    .font(.caption2)
                    .foregroundColor(.green)
            }
        }
        .padding()
    }
}

@main
struct CCCheckerWidget: Widget {
    let kind: String = "CCCheckerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CCCheckerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("CC Checker Status")
        .description("Monitor your credit card checking progress.")
        .supportedFamilies([.systemSmall])
    }
}
