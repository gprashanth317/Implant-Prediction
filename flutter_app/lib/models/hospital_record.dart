class HospitalRecord {
  final int id;
  final String name;
  final String city;
  final String phone;
  final String altPhone;
  final String address;
  final double lat;
  final double lng;
  final String emergency;
  final String rating;
  final String specialties;
  double distanceKm;

  HospitalRecord({
    required this.id,
    required this.name,
    required this.city,
    required this.phone,
    required this.altPhone,
    required this.address,
    required this.lat,
    required this.lng,
    required this.emergency,
    required this.rating,
    required this.specialties,
    this.distanceKm = -1.0,
  });
}
