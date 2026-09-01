import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/hospital_record.dart';

class HospitalsScreen extends StatefulWidget {
  const HospitalsScreen({super.key});

  @override
  State<HospitalsScreen> createState() => _HospitalsScreenState();
}

class _HospitalsScreenState extends State<HospitalsScreen> {
  final List<HospitalRecord> _all = [
    HospitalRecord(id: 1, name: 'Saveetha Dental & Maxillofacial Hospital', city: 'Chennai', phone: '+91 44 2680 1580', altPhone: '+91 98410 23456', address: '162 Poonamallee High Rd, Chennai 600077', lat: 13.0544, lng: 80.0967, emergency: '🚨 24x7 Emergency Trauma Unit', rating: '4.9 ⭐⭐⭐⭐⭐', specialties: 'Oral & Maxillofacial Surgery'),
    HospitalRecord(id: 2, name: 'Apollo Dental & Craniofacial Center', city: 'Chennai', phone: '+91 44 2829 0200', altPhone: '1800 102 0288', address: 'Greams Road, Thousand Lights, Chennai 600006', lat: 13.0604, lng: 80.2496, emergency: '🚨 24x7 Emergency Care', rating: '4.8 ⭐⭐⭐⭐⭐', specialties: '3D Guided Implantology'),
    HospitalRecord(id: 3, name: 'Government Dental College & Research Institute', city: 'Bengaluru', phone: '+91 80 2670 5053', altPhone: '+91 80 2670 1599', address: 'Victoria Hospital Complex, Fort Road, Bengaluru 560002', lat: 12.9610, lng: 77.5750, emergency: '🚨 24x7 Emergency Trauma', rating: '4.8 ⭐⭐⭐⭐⭐', specialties: 'Maxillofacial Trauma'),
    HospitalRecord(id: 4, name: 'Manipal Hospital Dental & Maxillofacial Center', city: 'Bengaluru', phone: '+91 80 2502 4444', altPhone: '1800 102 5555', address: '98 HAL Old Airport Road, Bengaluru 560017', lat: 12.9592, lng: 77.6496, emergency: '🚨 24x7 Casualty', rating: '4.9 ⭐⭐⭐⭐⭐', specialties: 'Guided Implantology'),
    HospitalRecord(id: 5, name: 'Government Dental College & Hospital', city: 'Hyderabad', phone: '+91 40 2460 0147', altPhone: '+91 40 2460 0148', address: 'Afzalgunj, High Court Road, Hyderabad 500012', lat: 17.3688, lng: 78.4735, emergency: '🚨 24x7 Govt Trauma Wing', rating: '4.7 ⭐⭐⭐⭐⭐', specialties: 'Maxillofacial Reconstruction'),
    HospitalRecord(id: 6, name: 'Apollo Health City Dental & Implant Institute', city: 'Hyderabad', phone: '+91 40 2360 7777', altPhone: '1860 500 1066', address: 'Jubilee Hills, Hyderabad 500033', lat: 17.4165, lng: 78.4116, emergency: '🚨 24x7 Dental ICU', rating: '4.9 ⭐⭐⭐⭐⭐', specialties: 'All-on-4 Implants'),
  ];

  final List<HospitalRecord> _displayed = [];
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _displayed.addAll(_all);
  }

  void _filter(String q) {
    _displayed.clear();
    final query = q.toLowerCase().trim();
    for (var h in _all) {
      if (query.isEmpty || h.name.toLowerCase().contains(query) || h.city.toLowerCase().contains(query)) {
        _displayed.add(h);
      }
    }
    setState(() {});
  }

  void _call(String phone) async {
    final uri = Uri.parse('tel:\${phone.replaceAll(" ", "")}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  void _route(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=\$lat,\$lng');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🏥 Accredited Dental Hospitals'),
        backgroundColor: const Color(0xFF1E2D3C),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              onChanged: _filter,
              decoration: const InputDecoration(
                hintText: '🔍 Search hospital, city, area...',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.search),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ListView.builder(
                itemCount: _displayed.length,
                itemBuilder: (ctx, idx) {
                  final h = _displayed[idx];
                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    elevation: 3,
                    child: Padding(
                      padding: const EdgeInsets.all(14.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('🏥 \${h.name}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text('\${h.rating} • \${h.city}', style: const TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('📍 \${h.address}', style: const TextStyle(color: Colors.black87, fontSize: 12)),
                          Text(h.emergency, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.phone, size: 16),
                                  label: const Text('📞 Call Now'),
                                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF27AE60), foregroundColor: Colors.white),
                                  onPressed: () => _call(h.phone),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.directions, size: 16),
                                  label: const Text('🚗 Route'),
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                                  onPressed: () => _route(h.lat, h.lng),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
