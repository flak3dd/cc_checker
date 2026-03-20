import unittest
from automation.cc_checker.gen_vin import generate_vin, calculate_checksum

class TestGenVin(unittest.TestCase):
    def test_generate_vin_length(self):
        """Test if the generated VIN is 17 characters long."""
        vin = generate_vin()
        self.assertEqual(len(vin), 17)

    def test_generate_vin_invalid_chars(self):
        """Test if the generated VIN contains invalid characters (I, O, Q)."""
        for _ in range(100):
            vin = generate_vin()
            self.assertNotIn('I', vin)
            self.assertNotIn('O', vin)
            self.assertNotIn('Q', vin)

    def test_calculate_checksum_valid(self):
        """Test the checksum calculation with a known valid VIN base."""
        # This is a sample base (pos 9 is a placeholder)
        vin_base = "6H8ABCDE0RS123456"
        check_digit = calculate_checksum(vin_base)
        self.assertIn(check_digit, "0123456789X")

    def test_generate_vin_reproducibility(self):
        """Test if multiple generated VINs are mostly unique."""
        vins = set(generate_vin() for _ in range(100))
        self.assertGreater(len(vins), 90)

if __name__ == '__main__':
    unittest.main()
